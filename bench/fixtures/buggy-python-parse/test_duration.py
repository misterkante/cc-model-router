import unittest

from duration import parse_duration


class DurationTest(unittest.TestCase):
    def test_hours_and_minutes(self):
        self.assertEqual(parse_duration("1h30m"), 90)

    def test_minutes_only(self):
        self.assertEqual(parse_duration("45m"), 45)

    def test_hours_only(self):
        self.assertEqual(parse_duration("2h"), 120)

    def test_empty(self):
        self.assertEqual(parse_duration(""), 0)

    def test_space_between_parts(self):
        self.assertEqual(parse_duration("1h 30m"), 90)

    def test_minutes_out_of_range(self):
        with self.assertRaises(ValueError):
            parse_duration("1h90m")

    def test_minutes_only_out_of_range(self):
        with self.assertRaises(ValueError):
            parse_duration("90m")

    def test_invalid_text(self):
        with self.assertRaises(ValueError):
            parse_duration("abc")


if __name__ == "__main__":
    unittest.main()
