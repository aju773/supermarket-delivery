"""CSV product import through the admin API: preview saves nothing, apply is all or nothing."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from catalog.models import Category, PackOption, Product

pytestmark = pytest.mark.django_db

HEADER = "code,name,category,pack_label,price,group,in_stock\n"


def csv_file(text, name="export.csv"):
    return SimpleUploadedFile(name, text.encode(), content_type="text/csv")


def post(client, action, text):
    return client.post(
        f"/api/admin/import/{action}",
        {"file": csv_file(text)},
        headers={"X-CSRFToken": client.cookies["csrftoken"].value},
    )


def snapshot():
    """Everything the import could change, to compare before and after."""
    return (
        list(Category.objects.values_list("name", flat=True)),
        list(Product.objects.values_list("name", flat=True)),
        list(PackOption.objects.values_list("code", "label", "price_paise", "in_stock", "is_visible")),
    )


def test_import_endpoints_reject_anonymous_requests(client):
    assert client.post("/api/admin/import/preview").status_code == 401
    assert client.post("/api/admin/import/apply").status_code == 401


def test_preview_reports_creates_without_saving_anything(staff):
    before = snapshot()

    response = post(staff, "preview", HEADER + "111,Tomato,Vegetables,500 g,24,,\n222,Atta,Staples,5 kg,252.50,,\n")

    assert response.status_code == 200
    body = response.json()
    assert body["total_rows"] == 2
    assert body["products_created"] == 2
    assert body["pack_options_created"] == 2
    assert body["pack_options_updated"] == 0
    assert body["categories_created"] == ["Vegetables", "Staples"]
    assert body["errors"] == []
    assert body["changes"] == [
        {"row": 2, "code": "111", "product": "Tomato", "pack_label": "500 g", "old_price_paise": None, "new_price_paise": 2400, "action": "create"},
        {"row": 3, "code": "222", "product": "Atta", "pack_label": "5 kg", "old_price_paise": None, "new_price_paise": 25250, "action": "create"},
    ]
    assert snapshot() == before


def test_apply_creates_products_categories_and_options(staff):
    response = post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,24,,\n222,Atta,Staples,5 kg,252.50,,no\n")

    assert response.status_code == 200
    assert response.json() == {"products_created": 2, "pack_options_created": 2, "pack_options_updated": 0, "categories_created": 2}
    assert set(Category.objects.values_list("name", flat=True)) == {"Vegetables", "Staples"}
    atta = PackOption.objects.get(code="222")
    assert (atta.product.name, atta.product.category.name, atta.label, atta.price_paise, atta.in_stock) == (
        "Atta",
        "Staples",
        "5 kg",
        25250,
        False,
    )
    assert PackOption.objects.get(code="111").in_stock is True


def test_rows_sharing_a_group_become_one_product_with_several_options(staff):
    text = HEADER + "t250,Tomato,Vegetables,250 g,12,tomato,\nt500,Tomato,Vegetables,500 g,22,tomato,\nt1k,Tomato,Vegetables,1 kg,40,tomato,\nsingle,Onion,Vegetables,1 kg,30,,\n"

    preview = post(staff, "preview", text).json()
    assert preview["products_created"] == 2
    assert preview["pack_options_created"] == 4

    post(staff, "apply", text)
    tomato = Product.objects.get(name="Tomato")
    assert [(option.code, option.label) for option in tomato.pack_options.all()] == [("t250", "250 g"), ("t500", "500 g"), ("t1k", "1 kg")]
    assert Product.objects.get(name="Onion").pack_options.count() == 1


def test_reimport_updates_options_by_code_instead_of_duplicating(staff):
    post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,24,,\n")
    option = PackOption.objects.get(code="111")
    option.in_stock = False
    option.save()

    preview = post(staff, "preview", HEADER + "111,Tomato,Vegetables,500 g,26,,yes\n").json()
    assert preview["products_created"] == 0
    assert preview["pack_options_created"] == 0
    assert preview["pack_options_updated"] == 1
    assert preview["categories_created"] == []
    assert preview["changes"][0]["old_price_paise"] == 2400
    assert preview["changes"][0]["new_price_paise"] == 2600
    assert preview["changes"][0]["action"] == "update"

    response = post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,26,,yes\n")

    assert response.json()["pack_options_updated"] == 1
    assert Product.objects.count() == 1
    assert PackOption.objects.count() == 1
    option.refresh_from_db()
    assert (option.price_paise, option.in_stock) == (2600, True)


def test_blank_in_stock_leaves_an_existing_options_stock_alone(staff):
    post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,24,,no\n")

    post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,25,,\n")

    assert PackOption.objects.get(code="111").in_stock is False


def test_a_new_code_in_a_group_joins_the_existing_product(staff):
    post(staff, "apply", HEADER + "t500,Tomato,Vegetables,500 g,22,tomato,\n")

    response = post(staff, "apply", HEADER + "t500,Tomato,Vegetables,500 g,23,tomato,\nt1k,Tomato,Vegetables,1 kg,40,tomato,\n")

    assert response.json()["products_created"] == 0
    assert Product.objects.count() == 1
    assert sorted(PackOption.objects.values_list("code", flat=True)) == ["t1k", "t500"]
    assert PackOption.objects.get(code="t1k").product == PackOption.objects.get(code="t500").product


def test_updating_an_option_brings_back_one_that_was_hidden(staff):
    post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,24,,\n")
    PackOption.objects.filter(code="111").update(is_visible=False)

    post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,24,,\n")

    assert PackOption.objects.get(code="111").is_visible is True


def test_categories_match_existing_ones_by_name_in_any_case(staff):
    Category.objects.create(name="Vegetables")

    preview = post(staff, "preview", HEADER + "111,Tomato,vegetables,500 g,24,,\n222,Apple,Fruits,1 kg,90,,\n333,Pear,FRUITS,1 kg,80,,\n").json()

    assert preview["categories_created"] == ["Fruits"]
    post(staff, "apply", HEADER + "111,Tomato,vegetables,500 g,24,,\n222,Apple,Fruits,1 kg,90,,\n333,Pear,FRUITS,1 kg,80,,\n")
    assert sorted(Category.objects.values_list("name", flat=True)) == ["Fruits", "Vegetables"]
    assert Category.objects.get(name="Fruits").products.count() == 2


def test_rows_with_problems_are_reported_with_their_row_numbers(staff):
    text = (
        HEADER
        + "111,Tomato,Vegetables,500 g,24,,\n"  # row 2: fine
        + ",Onion,Vegetables,1 kg,30,,\n"  # row 3: no code
        + "333,,Vegetables,1 kg,30,,\n"  # row 4: no name
        + "444,Garlic,,1 kg,30,,\n"  # row 5: no category
        + "555,Ginger,Vegetables,,30,,\n"  # row 6: no pack label
        + "666,Beans,Vegetables,1 kg,,,\n"  # row 7: no price
        + "777,Peas,Vegetables,1 kg,abc,,\n"  # row 8: price not a number
        + "888,Okra,Vegetables,1 kg,-5,,\n"  # row 9: negative price
        + "999,Corn,Vegetables,1 kg,10,,maybe\n"  # row 10: in_stock not understood
        + "111,Tomato again,Vegetables,1 kg,10,,\n"  # row 11: code used twice
    )

    body = post(staff, "preview", text).json()

    assert body["total_rows"] == 10
    assert [(error["row"], error["code"]) for error in body["errors"]] == [
        (3, ""),
        (4, "333"),
        (5, "444"),
        (6, "555"),
        (7, "666"),
        (8, "777"),
        (9, "888"),
        (10, "999"),
        (11, "111"),
    ]
    messages = [error["message"] for error in body["errors"]]
    assert messages[0] == "Code is missing."
    assert messages[1] == "Name is missing."
    assert messages[2] == "Category is missing."
    assert messages[3] == "Pack label is missing."
    assert messages[4] == "Price is missing."
    assert messages[5] == "Price must be an amount like 24 or 24.50."
    assert messages[6] == "Price can't be negative."
    assert messages[7] == "In stock must be yes or no."
    assert messages[8] == "Same code appears twice in the file."
    assert [change["code"] for change in body["changes"]] == ["111"]


def test_a_group_must_agree_on_name_and_category(staff):
    text = HEADER + "a,Tomato,Vegetables,250 g,12,tomato,\nb,Tomatoes,Vegetables,500 g,22,tomato,\nc,Tomato,Fruits,1 kg,40,tomato,\n"

    body = post(staff, "preview", text).json()

    assert [(error["row"], error["message"]) for error in body["errors"]] == [
        (3, "Name differs from the first row of group “tomato”."),
        (4, "Category differs from the first row of group “tomato”."),
    ]


def test_a_group_cannot_span_two_existing_products(staff):
    post(staff, "apply", HEADER + "a,Tomato,Vegetables,250 g,12,,\nb,Onion,Vegetables,1 kg,30,,\n")

    body = post(staff, "preview", HEADER + "a,Tomato,Vegetables,250 g,12,mix,\nb,Tomato,Vegetables,1 kg,30,mix,\n").json()

    assert [error["row"] for error in body["errors"]] == [3]
    assert "different product" in body["errors"][0]["message"]


def test_apply_with_any_error_saves_nothing(staff):
    before = snapshot()

    response = post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,24,,\n222,Onion,Vegetables,1 kg,oops,,\n")

    assert response.status_code == 400
    assert response.json()["detail"] == "The file has 1 row with a problem, so nothing was imported. Fix it and choose the file again."
    assert snapshot() == before


def test_apply_saves_nothing_when_the_database_rejects_part_of_it(staff, monkeypatch):
    from catalog import csv_import

    before = snapshot()
    real_bulk_create = PackOption.objects.bulk_create

    def failing(*args, **kwargs):
        real_bulk_create(*args, **kwargs)
        raise RuntimeError("disk full")

    monkeypatch.setattr(csv_import.PackOption.objects, "bulk_create", failing)

    with pytest.raises(RuntimeError):
        post(staff, "apply", HEADER + "111,Tomato,Vegetables,500 g,24,,\n")

    assert snapshot() == before


@pytest.mark.parametrize(
    "text, message",
    [
        ("", "The file is empty."),
        ("code,name,category,pack_label\n1,a,b,c\n", "The file is missing the price column."),
        ("name,price\nTomato,24\n", "The file is missing the code, category and pack_label columns."),
        (HEADER, "The file has no product rows."),
    ],
)
def test_files_that_cannot_be_read_are_refused(staff, text, message):
    for action in ("preview", "apply"):
        response = post(staff, action, text)
        assert response.status_code == 400
        assert response.json()["detail"] == message


def test_column_names_ignore_case_spaces_and_order_and_the_optional_ones_may_be_left_out(staff):
    text = "﻿Price , Pack_Label,CODE,Name,Category\n24,500 g,111,Tomato,Vegetables\n"

    body = post(staff, "preview", text).json()

    assert body["errors"] == []
    assert body["changes"][0]["code"] == "111"
    assert body["changes"][0]["new_price_paise"] == 2400


def test_blank_lines_and_surrounding_spaces_are_ignored(staff):
    body = post(staff, "preview", HEADER + "\n  111 , Tomato , Vegetables , 500 g , 24 ,,\n\n").json()

    assert body["total_rows"] == 1
    assert body["changes"][0]["code"] == "111"
    assert body["changes"][0]["product"] == "Tomato"


def test_a_file_that_is_not_text_is_refused(staff):
    response = staff.post(
        "/api/admin/import/preview",
        {"file": SimpleUploadedFile("export.csv", b"\xff\xfe\x00\x01binary", content_type="text/csv")},
        headers={"X-CSRFToken": staff.cookies["csrftoken"].value},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "This doesn't look like a CSV file."
