categorized_items = {'bakery': ['oat', 'berry'], 'dairy': ['milk', 'cheese']}
known_product = {'pantry': ['oat', 'sugar'], 'dairy': ['milk']}

# Iterate through all categories in known_product
for category_b, items_b in known_product.items():
    # Find common items and remove them from all categories in categorized_items
    for items_a in categorized_items.values():
        items_a[:] = [item for item in items_a if item not in items_b]

# Remove empty lists from dictionary categorized_items
categorized_items = {category: items for category, items in categorized_items.items() if items}

print(categorized_items)
