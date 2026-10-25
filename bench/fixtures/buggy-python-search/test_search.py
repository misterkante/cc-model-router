import unittest

from search import binary_search, find_all


class SearchTest(unittest.TestCase):
    def test_found(self):
        self.assertEqual(binary_search([1, 3, 5, 7], 5), 2)

    def test_not_found(self):
        self.assertEqual(binary_search([1, 3, 5, 7], 4), -1)

    def test_first_occurrence(self):
        self.assertEqual(binary_search([1, 2, 2, 2, 3], 2), 1)

    def test_empty(self):
        self.assertEqual(binary_search([], 1), -1)

    def test_find_all(self):
        self.assertEqual(find_all([1, 2, 2, 3], 2), [1, 2])


if __name__ == "__main__":
    unittest.main()
