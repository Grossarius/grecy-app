import time
import pandas as pd
import json
import openai
import os
from dotenv import load_dotenv
import re
import inflect
from collections import defaultdict
from decimal import Decimal
from typing import Dict, List, Tuple, Union
from flask import Flask, request, jsonify
from flask_cors import CORS


# Setup
load_dotenv()
GPT_MODEL = "gpt-3.5-turbo"
openai.api_key = os.getenv("OPENAI_API_KEY")
p = inflect.engine()
app = Flask(__name__)
CORS(app)

# ChatGPT setup to return JSON formatted data
def json_gpt(input: str) -> Dict:
    completion = openai.ChatCompletion.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system", "content": "Output only valid JSON"},
            {"role": "user", "content": input},
        ],
        temperature=0.5,
    )
    text = completion.choices[0].message.content
    print(text)
    parsed = json.loads(text)
    return parsed

# ChatGPT to categorize data into their general categories that match the Woolies app
def categorize_ingredients(recipe: str) -> Dict[str, List[str]]:
    # Give ChatGPT related subcategories of the general categories -> better chance of finding the right category
    category_dict = {
        "bakery": ["bakery", "bread", "pastries"],
        "dairy-eggs-fridge": ["dairy-eggs-fridge", "milk", "cheese", "yogurt", "cream", "dips", "ready meals", "international food", "vegan"],
        "drinks": ["drinks", "juices", "soda", "water", "tea", "coffee", "energy drinks"],
        "freezer": ["freezer", "frozen meals", "ice cream", "frozen vegetables", "frozen fruit"],
        "fruit-veg": ["fruit-veg", "fruits", "vegetables", "salads", "organic", "fresh herbs"],
        "health-wellness health-foods": ["dried fruit", "nuts", "seeds","health-wellness"],
        "lunch-box": ["lunch-box", "sandwiches", "snack packs", "fruit cups", "sweet"],
        "pantry": ["pantry", "canned goods", "spreads", "spices", "seasoning", "condiments", "pasta, rice, grains", "cooking sauces", "oil and vinegar", "international foods", "flour"],
        "poultry-meat-seafood": ["poultry-meat-seafood", "poultry", "meat", "seafood"]
    }
    # Put them all into a list for ChatGPT and then re-categorize them later
    category_list = [item for sublist in category_dict.values() for item in sublist]

    # One call: Faster but sometimes it misses some ingredients
    # # ChatGPT to help categorize items
    # QUERIES_INPUT = f"""
    #     Get all the ingredients in the recipe.

    #     Recipe: {recipe}

    #     Only include ingredients that are in the recipe, without the measurements.

    #     Then, group the ingredients into the provided categories below. 
    #     Use ONLY the provided categories and items. Make sure to group all the items.

    #     Categories:
    #     {category_list}

    #     Format:
    #     "category_1": ["item_1", "item_2", ...],
    #     "category_2": ["item_1", "item_2", ...],
    #     ...
    # """

    # ingredients = json_gpt(QUERIES_INPUT)
    # Two calls: One to get ingredients and one to categorize. Better results but slower + glitchy
    QUERIES_INPUT = f"""
    Get all the ingredients in the recipe. 
    This is the recipe: {recipe}
    Only include ingredients that are in the recipe, don't include the measurements.
    Format: {{"Ingredients": ["ingredient_1", "ingredient_2",...]}}
    """

    ingredients = json_gpt(QUERIES_INPUT)["Ingredients"]
    time.sleep(1)

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
    # End of ChatGPT
    print("Output from GPT: ", ingredients)
    # Combine the known categories and the ones from ChatGPT
    # Merge the subcategories into the general categories
    categorized_items = {}
    for key, value in ingredients.items():
        for category, keywords in category_dict.items():
            # Check if any keyword in the category is present in the item
            if key in keywords:
                categorized_items[category] = categorized_items.get(category, []) + value
                break
    # Filter out ones with empty list
    categorized_items = {key: value for key, value in categorized_items.items() if value}
    # Remove duplicate
    for key, values in categorized_items.items():
        categorized_items[key] = list(set(values))
    return categorized_items

# Find all the good products of an item (ex: Item: Soba Noodles -> Products: "Obento Soba Noodles", "Redrock Soba Noodles", "Hakubaku Soba Noodles")")    
def find_product(product: str, df, k: str, filter_ingredient = True, bad_list: List[str] = []) -> pd.DataFrame:
    # Hard code: remove an ingredient from the bad list and add them back later (ex: Syrup is bad but Maple Syrup isn't)
    add_list = []
    if "maple syrup" in product:
        add_list.append("Syrup")
        bad_list.remove("Syrup")
    # Hard code: renaming/removing/replacing words from the product's name
    if "scallion" in product or "green onion" in product:
        product = "spring onion"
    if "ketchup" in product:
        product = "tomato sauce"
    if "ground" in product:
        product = product.replace("ground", "mince")
    if ("raising" in product and "flour" in product) or "self-raising" in product:
        product = "raising flour"
    if "cornflour" in product or "cornstarch" in product:
        product = "cornflour"
    if "all-purpose" in product and "flour" in product:
        product = "plain flour"
    if "lemon" in product:
        product = "lemon"
    
    all_replace = ["parmesan", "cheddar", "basil", "oregano", "pepper flakes", "spaghetti"]
    for i in all_replace:
        if i in product:
            product = i

    words_to_remove = ["skinless", "fresh", "dry", "chopped", "shred", "shredded", "diced", "sliced", "grated", "cubed", "julienne", "pureed", "mashed", "leaves", "crushed", "sliced", "whole", "boneless"]
    print("Product before processed: ", words_to_remove)
    for word in words_to_remove:
        if word in product:
            product = product.replace(word, "")

    # Default: make the product singular. So the items below will be pluralized
    product = p.singular_noun(product.lower()) or product.lower()
    # Remove things in () (ex: "Soba Noodles (Buckwheat)" -> "Soba Noodles")
    product = re.sub(r'\([^)]*\)', '', product)
    print("Product after processed: ", product)
    product = product.replace(",", "")
    product = product.strip()
    
    words_to_pluralize = ["noodle", "egg", "seed", "berry", "oat"]
    exit_loop = False
    for word in words_to_pluralize:
        if exit_loop:
            break
        for w in product.split():
            if word == w:
                product = p.plural(product)
                exit_loop = True
                break

    # Split the product name into words to look up in the database (ex: Some brands say Noodles Soba instead of Soba Noodles)
    product_split = product.split()

    # Filter out rows that do not contain the product name
    selected_rows = df.copy()  # Create a copy of the original dataframe
    for keyword in product_split:
        selected_rows = selected_rows[selected_rows['Product Name'].str.contains(fr'\b{re.escape(keyword)}\b', case=False)]
    # Hard code
    # Filter out rows with no ingredients for certain categories only
    if k != 'fruit-veg' and k != 'poultry-meat-seafood':
        selected_rows = selected_rows[~selected_rows['Ingredients'].isna()]    
    
    # Select only rows that are within a department or similar criteria #Filter honey food product  - nick
    """"""
    if product == "honey":
        selected_rows = selected_rows[selected_rows["Aisle"].str.lower() == "honey"]
    if product == "egg":
        selected_rows = selected_rows[selected_rows["Aisle"].str.lower() == "eggs"]
    if product == "ginger":
        selected_rows = selected_rows[selected_rows["Department"].str.lower() != "drink"]
    if product == "butter":
        selected_rows = selected_rows[selected_rows["Sap Category Name"].str.lower() == "dairy - butter & margarine"]
    if "spaghetti" in product:
        selected_rows = selected_rows[selected_rows["Sap Sub Category Name"].str.lower() == "pasta"]
    if any(word in product for word in ["parmesan", "cheddar", "mozzarella", "cheese"]):
        selected_rows = selected_rows[selected_rows["Department"].str.lower() == "dairy"]
    """"""


    print("Len of selected rows (before filtering): ", len(selected_rows))

    # Get the 'Product Name' and 'Ingredients' columns as Series
    product_names = selected_rows['Product Name']
    ingredients_series = selected_rows['Ingredients']
    cup_prices = selected_rows['Cup Price']
    price = selected_rows['Price']
    stockcode = selected_rows['Stockcode']
    image = selected_rows['Medium Image File']
    cup = selected_rows['Cup Measure']

    clean_products_df = pd.DataFrame(columns=['Product Name', 'Ingredients', 'Cup Price', 'Price', 'Stockcode', "Image"])
    
    # Filter out the bad products and add the good ones to the clean_products_df
    for product_name, ingredients, cup_price, price, stockcode, image, cup in zip(product_names, ingredients_series, cup_prices, price, stockcode, image, cup):
        clean = True
        # For categories like fruit-veg or poultry-meat-seafood, the ingredients list is empty -> if isinstance
        # Split the string at commas that are not between parentheses
        # Filter out items with bad ingredients
        if filter_ingredient:
            if isinstance(ingredients, str):
                ingredients_list = re.split(r',\s*(?![^()]*\))', ingredients)
                # Iterate over each ingredient in the list
                for ingredient in ingredients_list:
                    # Check if the ingredient is in the bad_list
                    for bad_item in bad_list:
                        # Normalize bad_list item to lowercase and split it into individual words
                        bad_item_lower = bad_item.lower()
                        bad_words = re.findall(r'\b\w+\b', bad_item_lower)
                        
                        # Check if all the words from bad_list are present in the ingredient
                        all_words_present = all(word in ingredient.lower() for word in bad_words)
                        
                        if all_words_present:
                            clean = False
            else:
                ingredients_list = []
        else:
            ingredients_list = []
        # Ingredients shouldn't be more than a certain amount
        gum = 0
        oil = 0
        emulsifier = 0
        # Count the occurrences of specific ingredients
        gum = sum(ingredient.lower().count("gum") for ingredient in ingredients_list)
        oil = sum(ingredient.lower().count("oil") for ingredient in ingredients_list)
        emulsifier = sum(ingredient.lower().count("emulsifier") for ingredient in ingredients_list)

        if gum > 2 or oil > 2 or emulsifier > 2:
            clean = False

        # If the product is clean, add it to the list
        if clean:
            clean_products_df = pd.concat([clean_products_df, pd.DataFrame({
                'Product Name': [product_name],
                'Ingredients': [ingredients],
                'Cup Price': [cup_price],
                "Price": [price],
                "Stockcode": [stockcode],
                "Image": [image],
                "Cup": [cup]
            })])
    
    clean_products_df_sorted = clean_products_df.sort_values(by='Cup Price')
    if not clean_products_df_sorted.empty:
        print("Clean product found")
    # Add back the ingredients removed from the bad list
    for item in add_list:
        bad_list.append(item)
    return clean_products_df_sorted

# The main function that return all the good products, a grocery list, and a list of items that have no good products
def get_all_product(data: str, top = 5, bad_list: List[str] = []) -> Tuple[Dict[str, List[Dict[str, any]]], List[Dict[str, any]], Dict[str, List[str]]]:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, '..', 'data')
    print(data_dir)
    all_none = {}
    all_res = defaultdict(list)
    buy_list = []

    categorized_items = categorize_ingredients(data)

    # Recategorize some products according to the manual list
    known_category = {
        "bakery": ["bakery", "bread"],
        "dairy-eggs-fridge": ["parmigiano reggiano", "milk", "cheese", "yogurt", "cream", "dips", "butter","egg"],
        "drinks": ["drinks", "juices", "soda", "water", "tea", "coffee", "energy drinks"],
        "freezer": ["freezer", "frozen meals", "ice cream", "frozen vegetables", "frozen fruit", "frozen berry"],
        "fruit-veg": ["scallion", "chopped onion", "white onion", "garlic cloves", "basil", "lime", "lemon","ginger", "chilli"],
        "health-wellness health-foods": [""],
        "lunch-box": [],
        "pantry": ["fish sauce", "flour", "self-raising flour", "glucose syrup", "cereal", "sesame seed", "mirin", "peanut butter"],
        "poultry-meat-seafood": ["poultry", "meat", "seafood"]
    }
    known_product = {}
    item_list = []
    for items in categorized_items.values():
        item_list.extend(items)
    for product in item_list:
        product2 = p.singular_noun(product.lower()) or product.lower()   
        for k, v in known_category.items():
            if product2 in v: 
                known_product[k] = known_product.get(k, []) + [product]
                # Iterate over the dictionary to find the item and delete
                categorized_items = {key: value for key, value in categorized_items.items() if value != product}
                print(product)
                print("after: ", categorized_items)
                for key, value in list(categorized_items.items()):
                    if value == product:
                        del categorized_items[key]
                break
    # Combine the known categories and the ones from ChatGPT
    categorized_items = {key: known_product.get(key, []) + categorized_items.get(key, []) for key in set(known_product) | set(categorized_items)}
    # Filter out ones with empty list
    categorized_items = {key: value for key, value in categorized_items.items() if value}
    # Remove duplicate
    for key, values in categorized_items.items():
        categorized_items[key] = list(set(values))
    ###

    # Load data and find product then add them to a json called all_res
    for k, v in categorized_items.items():
        # Load files
        # Because there are 2 files for pantry items
        file_path2 = None
        if k == "pantry":
            file_path = os.path.join(data_dir, f'Woolies {k} 1 info.xlsx')
            file_path2 = os.path.join(data_dir, f'Woolies {k} 2 info.xlsx')

            # file_path = f"{root_path}Woolies {k} 1 info.xlsx"
            # file_path2 = f"{root_path}Woolies {k} 2 info.xlsx"
        else:
            file_path = os.path.join(data_dir, f'Woolies {k} info.xlsx')
            # file_path = f"{root_path}Woolies {k} info.xlsx"
        df = pd.read_excel(file_path)
        if file_path2:
            df2 = pd.read_excel(file_path2)
            df = pd.concat([df, df2], ignore_index=True)
        # Find product 
        for product in v:
            original_product = product
            print("Product: ", product)
            print("Category: ", k)
            # Skip unnecessary ingredients
            # all_skip = ["water", "sugar", "salt"]
            all_skip = []
            skip = False
            for item in all_skip:
                if item in product:
                    skip = True
                    break
            if skip:
                continue
            clean_products_df_sorted = find_product(product, df, k, bad_list = bad_list)
            
            # GET THE TOP 5 CHEAPEST UNIT PRICE PRODUCTS
            for index, row in clean_products_df_sorted.head(top).iterrows():
                product_name = row['Product Name']
                ingredients = row['Ingredients']
                if ingredients is not str:
                    ingredients = "No ingredients listed"
                cup_price = row['Cup Price']
                price = row['Price']
                stockcode = row['Stockcode']
                image = row['Image']
                cup = row['Cup']
                
                all_res[product].append({
                    'product_name': product_name,
                    'ingredients': ingredients,
                    'cup_price': cup_price,
                    'price': price,
                    'stockcode': "https://www.woolworths.com.au/shop/productdetails/{}".format(stockcode),
                    'image': image,
                    'cup': cup
                })
            print(len(clean_products_df_sorted))
            if clean_products_df_sorted.empty:
                all_none[k] = all_none.get(k, []) + [original_product]
        buy_list = []
        for k, v in all_res.items():
            lowest_price = float('inf')
            lowest_price_product = None
            # Iterate over the product list to find the product with the lowest price
            for product in v:
                price = product['price']
                if price < lowest_price:
                    lowest_price = price
                    lowest_price_product = product
            buy_list.append(lowest_price_product)
    return all_res, buy_list, all_none

@app.route('/get_product', methods=['POST'])
def get_product_api():
    data = request.get_json()["requestBody"]
    prompt = data.get('prompt')
    filter = data.get('filter')
    top = data.get('top')
    bad_list = data.get('badList')
    if bad_list == [""]:
        bad_list = []
    print("Data: ", data)
    # Get the bad products that are not found 
    if not filter:
        prompt = data["allItems"]
        bad_list = []
    all_res, buy_list, all_none = get_all_product(data = prompt, top = top, bad_list = bad_list)
    response = {
        'all_res': dict(all_res),
        'buy_list': buy_list,
        'all_none': dict(all_none),
        'filter': filter
    }

    print(response)

    # Return the JSON response object
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)

# recipe = """
# 5 tbsp oil
# 2 eggs lightly beaten
# 3 tbsp cornflour/cornstarch
# 10 tbsp plain/all-purpose flour
# 2 tsp paprika
# 3 chicken breast fillets chopped into bite-size chunks
# """
# all_res, buy_list, all_none = get_all_product(data = recipe, top = 5, bad_list = bad_list)
# all_res_bad = get_bad_product(all_none)
# print(buy_list)
# print(len(buy_list))
# print(all_none)