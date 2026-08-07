import requests
import random
import json

# Funktion, um einen zufälligen Preis zu generieren
def generate_random_price():
    return f"${random.randint(1, 10000):,}"

# Funktion, um zufällige Benutzer zu holen
def get_random_user():
    url = "https://randomuser.me/api/"
    response = requests.get(url)
    user_data = response.json()

    if "results" in user_data:
        user = user_data["results"][0]
        name = f"{user['name']['first']} {user['name']['last']}"
        image_url = user["picture"]["large"]
        return name, image_url
    return None, None

# Funktion, um die JSON-Datei zu erstellen
def create_product_json(num_products=4000):
    products = []
    
    for i in range(1, num_products + 1):
        name, image_url = get_random_user()
        
        if name and image_url:
            price = generate_random_price()
            product = {
                "name": name,
                "price": price,
                "image_url": image_url
            }
            products.append(product)
        
        # Zeigt den Fortschritt an
        if i % 5 == 0:  # Alle 100 Produkte
            print(f"Processed {i} of {num_products} products...")

    # Speichern der Produkte in einer JSON-Datei mit korrekter Zeichencodierung
    with open("products.json", "w", encoding="utf-8") as json_file:
        json.dump({"products": products}, json_file, indent=4, ensure_ascii=False)

# Hauptfunktion
def main():
    create_product_json()

if __name__ == "__main__":
    main()
