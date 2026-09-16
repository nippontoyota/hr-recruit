from scripts.measure_read_p95 import percentile_ms


def test_percentile_uses_the_conservative_nearest_rank_method():
    samples = [10.0] * 36 + [800.0, 950.0, 1_000.0, 1_100.0]

    assert percentile_ms(samples, 0.95) == 950.0


def test_percentile_rejects_empty_samples():
    try:
        percentile_ms([])
    except ValueError as error:
        assert str(error) == "At least one timing sample is required."
    else:
        raise AssertionError("Expected percentile_ms to reject empty samples.")
