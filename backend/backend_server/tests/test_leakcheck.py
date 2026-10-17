from app.agent.leakcheck import leaks, scrub

SRC = "I felt ignored when Sam scrolled through dinner at Nico's and I still love our walks."


def test_detects_verbatim_span():
    assert leaks("they said: Sam scrolled through dinner at Nico's and", SRC, 6)


def test_short_overlap_is_fine():
    assert not leaks("dinner at Nico's was nice", SRC, 6)


def test_scrub_replaces_everything_if_needed():
    h, b, dropped = scrub(["Sam scrolled through dinner at Nico's and I"], "I felt ignored when Sam scrolled through dinner", SRC, 6)
    assert dropped == 2 and len(b) == 1 and "quiet moment" in b[0]


def test_no_source_means_no_leak():
    assert not leaks("anything at all here you like", None, 6)
