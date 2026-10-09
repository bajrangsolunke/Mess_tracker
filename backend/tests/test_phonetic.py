"""Cross-script name search (voice input in Marathi finds English names and back)."""

import pytest

from app.core.phonetic import matches, to_ascii_digits
from tests.factories import create_member, create_plan, register_owner

# keep in step with frontend/src/lib/phonetic.test.ts
CASES = [
    ("Rahul Sharma", "राहुल"),
    ("Rahul Sharma", "शर्मा"),
    ("Priya Deshmukh", "देशमुख"),
    ("Sandeep Yadav", "संदीप"),
    ("Vikas Jadhav", "विकास जाधव"),
    ("Sneha Patil", "पाटील"),
    ("Kiran Shinde", "शिंदे"),
    ("Pooja Kulkarni", "पूजा"),
    ("Vijay Bhosale", "भोसले"),
    ("राहुल शर्मा", "Rahul"),
    ("सचिन पाटील", "sachin pat"),
    ("Rahul Sharma", "rah"),
]
NOT = [("Rahul Sharma", "सचिन"), ("Sneha Patil", "राहुल"), ("Amit Kumar", "Sumit")]


@pytest.mark.parametrize(("name", "query"), CASES)
def test_matches(name, query):
    assert matches(name, query)


@pytest.mark.parametrize(("name", "query"), NOT)
def test_does_not_match(name, query):
    assert not matches(name, query)


def test_devanagari_digits():
    assert to_ascii_digits("१००५") == "1005"


async def test_search_finds_english_name_from_marathi_voice(client):
    h, _ = await register_owner(client)
    plan = await create_plan(client, h)
    m = (await create_member(client, h, plan["id"], name="Sandeep Yadav"))["member"]
    await create_member(client, h, plan["id"], phone="9000000012", name="Rahul Sharma")
    r = await client.get("/api/v1/members?search=संदीप", headers=h)
    assert [x["name"] for x in r.json()["items"]] == ["Sandeep Yadav"]
    r = await client.get(f"/api/v1/attendance/search?q={'१' + str(m['member_no'])[1:]}", headers=h)
    # Devanagari first digit + ASCII rest still finds the member number
    assert r.json()[0]["member"]["id"] == m["id"]
    r = await client.get("/api/v1/attendance/search?q=शर्मा", headers=h)
    assert [x["member"]["name"] for x in r.json()] == ["Rahul Sharma"]
