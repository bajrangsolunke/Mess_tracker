"""Push / inbox texts per language. Each entry is (title, body); placeholders use str.format."""

from app.models import Language

MESSAGES: dict[str, dict[Language, tuple[str, str]]] = {
    # --- to a member (via their link) ---------------------------------------------------
    "meal_present": {
        Language.en: ("{meal} ✓", "Marked at {time}. {left}"),
        Language.hi: ("{meal} ✓", "{time} पर दर्ज। {left}"),
        Language.mr: ("{meal} ✓", "{time} ला नोंद झाली. {left}"),
    },
    "meal_absent": {
        Language.en: ("{meal} marked absent", "{date}. Ask the mess if this is wrong."),
        Language.hi: ("{meal} अनुपस्थित दर्ज", "{date}. गलत हो तो मेस से बात करें।"),
        Language.mr: ("{meal} अनुपस्थित नोंद", "{date}. चूक असल्यास मेसशी बोला."),
    },
    "tiffins_left": {
        Language.en: ("", "{left} tiffins left."),
        Language.hi: ("", "{left} टिफिन बाकी।"),
        Language.mr: ("", "{left} डबे बाकी."),
    },
    "tiffins_low": {
        Language.en: ("", "Only {left} tiffins left. Renew soon."),
        Language.hi: ("", "सिर्फ {left} टिफिन बाकी। जल्दी रिन्यू करें।"),
        Language.mr: ("", "फक्त {left} डबे बाकी. लवकर नूतनीकरण करा."),
    },
    "tiffins_over": {
        Language.en: ("", "All tiffins used. Please renew."),
        Language.hi: ("", "सभी टिफिन खत्म। कृपया रिन्यू करें।"),
        Language.mr: ("", "सर्व डबे संपले. कृपया नूतनीकरण करा."),
    },
    "payment_received": {
        Language.en: ("Payment received {amount}", "{due_line}"),
        Language.hi: ("भुगतान मिला {amount}", "{due_line}"),
        Language.mr: ("पैसे मिळाले {amount}", "{due_line}"),
    },
    "due_line": {
        Language.en: ("", "Still due: {due}"),
        Language.hi: ("", "अभी बाकी: {due}"),
        Language.mr: ("", "अजून बाकी: {due}"),
    },
    "paid_line": {
        Language.en: ("", "Fully paid. Thank you!"),
        Language.hi: ("", "पूरा भुगतान हो गया। धन्यवाद!"),
        Language.mr: ("", "पूर्ण पैसे मिळाले. धन्यवाद!"),
    },
    "renewed": {
        Language.en: ("Membership renewed", "Valid till {till}. {pack}"),
        Language.hi: ("मेंबरशिप रिन्यू हुई", "{till} तक मान्य। {pack}"),
        Language.mr: ("सदस्यत्व नूतनीकरण झाले", "{till} पर्यंत वैध. {pack}"),
    },
    "pack_line": {
        Language.en: ("", "{count} tiffins."),
        Language.hi: ("", "{count} टिफिन।"),
        Language.mr: ("", "{count} डबे."),
    },
    "ending_soon": {
        Language.en: ("Membership ends {till}", "Renew at the mess to continue."),
        Language.hi: ("मेंबरशिप {till} को खत्म", "जारी रखने के लिए मेस में रिन्यू करें।"),
        Language.mr: ("सदस्यत्व {till} ला संपते", "पुढे चालू ठेवण्यासाठी मेसमध्ये नूतनीकरण करा."),
    },
    # --- to owner / staff ---------------------------------------------------------------
    "owner_pack_over": {
        Language.en: ("{name} #{no}: tiffins over", "All {total} tiffins used. Renew to continue."),
        Language.hi: ("{name} #{no}: टिफिन खत्म", "सभी {total} टिफिन खत्म। रिन्यू करें।"),
        Language.mr: ("{name} #{no}: डबे संपले", "सर्व {total} डबे संपले. नूतनीकरण करा."),
    },
    "tiffins_entered": {
        Language.en: ("Company tiffins · {meal}", "{lines} (by {who})"),
        Language.hi: ("कंपनी टिफिन · {meal}", "{lines} ({who})"),
        Language.mr: ("कंपनी डबे · {meal}", "{lines} ({who})"),
    },
    "new_member": {
        Language.en: ("New member: {name} #{no}", "{plan}"),
        Language.hi: ("नया सदस्य: {name} #{no}", "{plan}"),
        Language.mr: ("नवीन सदस्य: {name} #{no}", "{plan}"),
    },
    "meal_closed": {
        Language.en: (
            "{meal} closed",
            "{present} ate · {absent} missed · {tiffins} company tiffins",
        ),
        Language.hi: ("{meal} बंद", "{present} ने खाया · {absent} नहीं आए · {tiffins} कंपनी टिफिन"),
        Language.mr: ("{meal} संपले", "{present} जेवले · {absent} आले नाहीत · {tiffins} कंपनी डबे"),
    },
    "ending_soon_owner": {
        Language.en: ("{count} memberships end soon", "{names}"),
        Language.hi: ("{count} मेंबरशिप जल्द खत्म", "{names}"),
        Language.mr: ("{count} सदस्यत्व लवकर संपणार", "{names}"),
    },
    "staff_money": {
        Language.en: ("{kind} {amount}", "{date}"),
        Language.hi: ("{kind} {amount}", "{date}"),
        Language.mr: ("{kind} {amount}", "{date}"),
    },
    "test": {
        Language.en: ("Notifications are on ✓", "You will get updates from {mess} here."),
        Language.hi: ("नोटिफिकेशन चालू ✓", "{mess} की खबरें यहां मिलेंगी।"),
        Language.mr: ("सूचना सुरू ✓", "{mess} च्या सूचना इथे मिळतील."),
    },
}

WORDS: dict[str, dict[Language, str]] = {
    "lunch": {Language.en: "Lunch", Language.hi: "दोपहर का खाना", Language.mr: "दुपारचे जेवण"},
    "dinner": {Language.en: "Dinner", Language.hi: "रात का खाना", Language.mr: "रात्रीचे जेवण"},
    "veg": {Language.en: "veg", Language.hi: "वेज", Language.mr: "व्हेज"},
    "nonveg": {Language.en: "non-veg", Language.hi: "नॉन-वेज", Language.mr: "नॉन-व्हेज"},
    "staff_advance": {Language.en: "Advance", Language.hi: "एडवांस", Language.mr: "उचल"},
    "salary_payment": {
        Language.en: "Salary paid",
        Language.hi: "पगार दी",
        Language.mr: "पगार दिला",
    },
    "advance_repayment": {
        Language.en: "Advance returned",
        Language.hi: "एडवांस वापस",
        Language.mr: "उचल परत",
    },
}


def text(key: str, lang: Language, **kw) -> tuple[str, str]:
    by_lang = MESSAGES[key]
    title, body = by_lang.get(lang) or by_lang[Language.en]
    return title.format(**kw), body.format(**kw)


def word(key: str, lang: Language) -> str:
    return WORDS[key].get(lang) or WORDS[key][Language.en]
