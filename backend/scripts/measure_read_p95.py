"""Measure a read-only endpoint against the portal's p95 latency target."""

from __future__ import annotations

import argparse
import math
import sys
from statistics import median
from time import perf_counter
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def percentile_ms(samples: list[float], percentile: float = 0.95) -> float:
    """Return a conservative nearest-rank percentile from millisecond samples."""
    if not samples:
        raise ValueError("At least one timing sample is required.")
    if not 0 < percentile <= 1:
        raise ValueError("Percentile must be greater than zero and at most one.")
    ordered = sorted(samples)
    return ordered[math.ceil(percentile * len(ordered)) - 1]


def request_status_and_duration_ms(url: str, timeout_seconds: float) -> tuple[int, float]:
    request = Request(url, method="GET")
    started = perf_counter()
    try:
        with urlopen(request, timeout=timeout_seconds) as response:  # noqa: S310 - caller supplies the target URL
            status = response.status
    except HTTPError as error:
        status = error.code
    return status, (perf_counter() - started) * 1000


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Read-only absolute endpoint URL to measure")
    parser.add_argument("--samples", type=int, default=40, help="Number of sequential requests (default: 40)")
    parser.add_argument("--expected-status", type=int, default=200, help="Expected HTTP status (default: 200)")
    parser.add_argument("--max-p95-ms", type=float, default=1000, help="Maximum permitted p95 duration (default: 1000)")
    parser.add_argument("--timeout-seconds", type=float, default=10, help="Per-request timeout (default: 10)")
    args = parser.parse_args()

    if args.samples < 1:
        parser.error("--samples must be at least one")
    if args.max_p95_ms <= 0:
        parser.error("--max-p95-ms must be positive")

    samples: list[float] = []
    for index in range(args.samples):
        status, duration_ms = request_status_and_duration_ms(args.url, args.timeout_seconds)
        if status != args.expected_status:
            print(f"sample {index + 1}: expected HTTP {args.expected_status}, received {status}", file=sys.stderr)
            return 2
        samples.append(duration_ms)

    p95 = percentile_ms(samples, 0.95)
    print(
        "samples={samples} p50_ms={p50:.1f} p95_ms={p95:.1f} max_ms={max_value:.1f}".format(
            samples=len(samples),
            p50=median(samples),
            p95=p95,
            max_value=max(samples),
        )
    )
    if p95 >= args.max_p95_ms:
        print(f"FAIL: p95 {p95:.1f}ms is not below {args.max_p95_ms:.1f}ms", file=sys.stderr)
        return 1
    print(f"PASS: p95 {p95:.1f}ms is below {args.max_p95_ms:.1f}ms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
