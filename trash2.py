QUERIES_INPUT = f"""
    Get all the ingredients in the recipe. 
    This is the recipe: {recipe}
    Only include ingredients that are in the recipe, don't include the measurements.
    Format: {{"Ingredients": ["ingredient_1", "ingredient_2",...]}}
    """

ingredients = json_gpt(QUERIES_INPUT)["Ingredients"]

QUERIES_INPUT = f"""

    
    Group the items into their respective categories. Use ONLY the provided categories and items.

    Categories: {category_list}
    Items: {ingredients}

    Skip empty lists.
    Make sure to group all the items.

    Format: 
    "category_1": ["item_1", "item_2", ...],
    "category_2": ["item_1", "item_2", ...],
    """

ingredients = json_gpt(QUERIES_INPUT)