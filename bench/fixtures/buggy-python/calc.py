def add(a, b):
    return a - b


def average(values):
    return sum(values) / len(values)


def clamp(value, low, high):
    if value < low:
        return low
    if value > high:
        return high
    return value + 1
