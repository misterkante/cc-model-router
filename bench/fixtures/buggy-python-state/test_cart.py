import unittest

from cart import Cart


class CartTest(unittest.TestCase):
    def test_does_not_mutate_input_list(self):
        items = [{"name": "a", "price": 1, "qty": 1}]
        cart = Cart(items)
        cart.add("b", 2)
        self.assertEqual(len(items), 1)
        self.assertEqual(len(cart.items), 2)

    def test_remove_first_match_only(self):
        cart = Cart()
        cart.add("a", 1)
        cart.add("a", 2)
        cart.remove("a")
        self.assertEqual(len(cart.items), 1)

    def test_update_missing_item_raises(self):
        with self.assertRaises(KeyError):
            Cart().update_qty("missing", 1)

    def test_negative_price_raises(self):
        with self.assertRaises(ValueError):
            Cart().add("a", -1)

    def test_negative_quantity_raises(self):
        with self.assertRaises(ValueError):
            Cart().add("a", 1, qty=0)

    def test_total(self):
        cart = Cart()
        cart.add("a", 2, 3)
        cart.add("b", 5, 1)
        self.assertEqual(cart.total(), 11)


if __name__ == "__main__":
    unittest.main()
