class Cart:
    def __init__(self, items=None):
        self.items = items or []

    def add(self, name, price, qty=1):
        self.items.append({"name": name, "price": price, "qty": qty})

    def total(self):
        return sum(item["price"] * item["qty"] for item in self.items)

    def remove(self, name):
        self.items = [item for item in self.items if item["name"] != name]

    def update_qty(self, name, qty):
        for item in self.items:
            if item["name"] == name:
                item["qty"] = qty
                break
