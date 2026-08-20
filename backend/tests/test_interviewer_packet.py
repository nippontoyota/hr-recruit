from app.core.interviewer_packet import filter_interviewer_packet


def test_packet_keeps_interview_fields_and_drops_ids():
    raw = {
        "age": "28",
        "gender": "Male",
        "permDistrict": "Ernakulam",
        "class10School": "St. Josephs",
        "aadhaarNumber": "123412341234",
        "panNumber": "ABCDE1234F",
        "drivingLicenseNumber": "KL01",
        "fatherName": "Hidden",
        "emergency1Contact": "9999999999",
        "permHouseName": "Villa",
        "prevTerminated": False,
        "whatsapp_invite": {"x": 1},
    }
    packet = filter_interviewer_packet(raw)
    assert packet["age"] == "28"
    assert packet["gender"] == "Male"
    assert packet["permDistrict"] == "Ernakulam"
    assert packet["class10School"] == "St. Josephs"
    assert packet["prevTerminated"] is False
    assert "aadhaarNumber" not in packet
    assert "panNumber" not in packet
    assert "drivingLicenseNumber" not in packet
    assert "fatherName" not in packet
    assert "emergency1Contact" not in packet
    assert "permHouseName" not in packet
    assert "whatsapp_invite" not in packet


def test_packet_empty_on_none():
    assert filter_interviewer_packet(None) == {}
    assert filter_interviewer_packet({}) == {}
