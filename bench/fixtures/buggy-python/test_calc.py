import unittest

from calc import add, average, clamp


class CalcTest(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)

    def test_average(self):
        self.assertEqual(average([2, 4, 6]), 4)

    def test_average_empty(self):
        self.assertEqual(average([]), 0)

    def test_clamp(self):
        self.assertEqual(clamp(5, 0, 10), 5)
        self.assertEqual(clamp(-1, 0, 10), 0)
        self.assertEqual(clamp(11, 0, 10), 10)


if __name__ == "__main__":
    unittest.main()
