import Image from "next/image";
import { Inter } from "next/font/google";
import { SetStateAction, useEffect, useState } from "react";
import path from "path";
import { promises as fs } from "fs";
import { stringify } from "querystring";
import { text } from "stream/consumers";

const inter = Inter({ subsets: ["latin"] });

interface Product {
  product_name: string;
  price: number;
  cup_price: number;
  cup: string;
  stockcode: string;
  image: string;
}

interface AllRes {
  [key: string]: Product[];
}

interface AllNone {
  [key: string]: string[];
}

function AllResComponent({ allRes }: { allRes: AllRes }) {
  return (
    <div className="my-8">
      {Object.keys(allRes).map((key) => (
        <div key={key} className="mb-4 text-center">
          <a
            href={`https://www.woolworths.com.au/shop/search/products?searchTerm=${key}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <p className="text-2xl font-bold mb-2">{key}</p>
          </a>
          <BuyList buyList={allRes[key]} id={"AllRes"} />
        </div>
      ))}
    </div>
  );
}

function BuyList({ id, buyList }: { id: string; buyList: Product[] }) {
  // Only show price if it's the grocery list
  let totalPrice: number = 0;
  if (id != "AllRes") {
    totalPrice = buyList.reduce((acc, item) => acc + item.price, 0);
  }

  return (
    <div>
      <div className="flex overflow-x-auto space-x-4">
        {buyList.map((item, index) => (
          <div
            key={index}
            className="flex flex-col bg-white rounded-lg p-4 shadow-md transition-transform duration-300 hover:scale-105"
            style={{
              minWidth: "200px",
              maxWidth: "200px",
              minHeight: "300px",
              maxHeight: "300px",
            }} // Adjust the width and height as needed
          >
            <div className="flex flex-col justify-between h-full overflow-auto">
              <div className="flex flex-col items-center">
                <img
                  src={item.image}
                  alt={item.product_name}
                  className="w-24 h-24 object-cover rounded-full"
                />
                <p className="text-center font-semibold">{item.product_name}</p>
              </div>
              <div className="flex flex-col mt-auto items-center">
                <p className="text-gray-600">Price: {item.price}</p>
                <p className="text-gray-600">
                  Cup Price: {item.cup_price}/{item.cup}
                </p>
                <a href={item.stockcode} className="text-blue-500 underline">
                  Link to the product
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Only show price if it's the grocery list */}
      {totalPrice > 0 && (
        <div className="mt-4">
          <p className="text-lg font-semibold">Total Price: {totalPrice}</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const isBrowser = () => typeof window !== "undefined";
  const defaultBadList = [
    "Artificial flavor",
    "Artificial flavour",
    "Natural flavor",
    "Natural flavour",
    "Aspartame",
    "BHT",
    "Calcium disodium EDTA",
    "Color",
    "Colour",
    "Carrageenan",
    "Corn starch",
    "Corn syrup",
    "Dextrose",
    "Dough conditioners",
    "Enriched flour",
    "Bleached flour",
    "Food color",
    "Maltodextrin",
    "Monoglycerides",
    "Monosodium glutamate",
    "Diglyceride",
    "Natural flavor",
    "Natural flavors",
    "Polysorbate",
    "Potassium sorbate",
    "Sodium erythorbate",
    "Sodium nitrate",
    "Sodium nitrite",
    "Sodium phosphate",
    "Soy protein isolate",
    "Splenda",
    "Sugar",
    "Syrup",
    "Sweetener",
    "Skim milk",
    "Low fat",
    "Reduced fat",
    "Xylitol",
  ];

  const [value, setValue] = useState<String>();

  const [allRes, setAllRes] = useState<AllRes>({});
  const [buyList, setBuyList] = useState<Product[]>([]);
  const [allNone, setAllNone] = useState<AllNone>({});
  const [allItems, setAllItems] = useState<string[]>([]);

  const [top, setTop] = useState<number>(10);
  const [badList, setBadList] = useState<string[]>([]);

  // One for each generate button (the second one only appears if allNone is not empty)
  const [isLoading, setIsLoading] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);

  const textAreaHandler = (event: {
    target: { value: SetStateAction<String | undefined> };
  }) => {
    setValue(event.target.value);
  };

  function scrollToPrompt() {
    if (!isBrowser()) return;
    window.scrollTo({ top: 1000, behavior: "smooth" });
  }

  const handleKeyDown = (event: {
    key: string;
    shiftKey: any;
    preventDefault: () => void;
  }) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      generateAPIHandler("generate_btn");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Perform any logic or submit the form here
    console.log(top);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setTop(Number(inputValue));
  };

  const handleBadListChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value;
    const ingredients = inputValue
      .split(/[,\s]+/)
      .map((ingredient) => ingredient.trim());
    setBadList(ingredients);
  };

  function badListHandler() {
    setBadList(defaultBadList);
  }
  async function generateAPIHandler(buttonId: string) {
    let requestBody: {
      prompt?: string;
      allItems?: string[];
      filter?: boolean;
      top?: number;
      badList?: string[];
    } = {};
    if (buttonId === "re_generate_btn") {
      setIsLoading2(true);
      requestBody = {
        allItems: allItems,
        filter: false,
        top: top,
        badList: badList,
      };
    } else {
      setIsLoading(true);
      requestBody = {
        prompt: value as string,
        filter: true,
        top: top,
        badList: badList,
      };
    }

    console.log(requestBody);

    fetch("http://127.0.0.1:5000/get_product", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestBody,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        console.log(data.filter);
        if (data.filter) {
          setAllRes(data.all_res);
          setBuyList(data.buy_list);
          setAllNone(data.all_none);
          setAllItems(Object.values(data.all_none).flat() as string[]);
        } else {
          setAllRes((prevAllRes) => ({ ...prevAllRes, ...data.all_res }));
          setBuyList((prevBuyList) => [...prevBuyList, ...data.buy_list]);
          setAllNone((prevAllNone) => ({ ...prevAllNone, ...data.all_none }));
          setAllItems(Object.values(data.all_none).flat() as string[]);
        }
        if (buttonId === "re_generate_btn") {
          setIsLoading2(false);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error) => console.log(error));
  }

  return (
    <div className="Parent">
      <div className="flex h-screen w-full bg-bg1" id="main_screen">
        <div className="flex-col h-full w-2/5 space-y-8 pl-48 py-64" id="left">
          <p className="flex text-8xl font-bold text-accent1" id="name">
            Grocery
          </p>
          <p className="flex text-xl font-normal w-4/5 text-text1" id="desc">
            ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum
            lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem
            ipsum lorem ipsum lorem{" "}
          </p>
          <button
            onClick={scrollToPrompt}
            className="flex text-2xl font-normal bg-pri_btn1 px-6 py-2 border border-text1 rounded transition ease-in-out duration:500 hover:bg-transparent hover:text-text1 hover:-translate-y-1"
            id="main_btn"
          >
            Try Now!
          </button>
        </div>
        <div className="flex h-screen w-3/5 justify-center items-center bg-bg1 " id="right">
          <div className="flex w-[750px] h-[750px] grow-0 shrink-0 justify-center items-center bg-accent1 rounded-full">
            <div
              className='flex h-[500px] w-[500px] justify-end items-end bg-[url("/cart.png")] bg-cover bg-center'
              id="img">
              <div className='flex h-[250px] w-[250px] justify-end bg-[url("/bag.png")] bg-cover bg-center my-5' id="img2"></div>
            </div>
            
          </div>
        </div>
      </div>

      <div className="flex-col h-full w-full bg-bg1" id="prompt">
        {/* <div className="flex h-1/6 w-full bg-accent1"></div> */}
        <div className="flex h-full w-full py-20 px-48 ">
          <div className="flex-col h-full w-full px-48 py-24 space-y-4 bg-accent1 rounded-lg">
            <p className="flex w-full text-white text-2xl font-medium justify-center">
              Enter your recipe:
            </p>
            <textarea
              onChange={textAreaHandler}
              onKeyDown={handleKeyDown}
              id="prompt"
              className="text-text1 w-full h-96 text-lg p-4"
              placeholder="Enter your recipe"
            ></textarea>

            <div className="mb-4">
              <label
                htmlFor="badList"
                className="block text-white mb-2 font-medium text-gray-700"
              >
                Enter ingredients you don't want to include (separated by commas):
              </label>
              <textarea
                id="badList"
                value={badList.join(", ")}
                rows={3}
                className="w-full text-text1 px-3 h-32 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                onChange={handleBadListChange}
              />
            </div>
            <div className="flex w-full justify-center">
              <button
                id="bad_list_btn"
                type="submit"
                onClick={() => badListHandler()}
                className="bg-sec_btn1 text-text1 px-16 py-4 rounded border border-text1 text-xl font-medium transition ease-in-out duration:500 hover:scale-110"
              >
                Set default filtering
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xs mx-auto">
              <div className="mb-4">
                <label
                  htmlFor="number"
                  className="block mb-2 text-white font-medium text-gray-700"
                >
                  Enter a number between 0 and 30:
                </label>
                <input
                  type="text"
                  id="number"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 text-text1"
                  value={top}
                  onChange={handleChange}
                />
              </div>
            </form>

            <div className="flex w-full justify-center">
              <button
                id="generate_btn"
                type="submit"
                onClick={() => generateAPIHandler("generate_btn")}
                className="bg-sec_btn1 text-text1 px-16 py-4 rounded border border-text1 text-xl font-medium transition ease-in-out duration:500 hover:scale-110"
              >
                {isLoading ? "Loading..." : "Find!"}
              </button>
            </div>
          </div>
        </div>
        
      </div>

      <div className="flex h-fit w-full bg-green-200 px-32 py-16">
        <div className="flex-col w-full px-32 space-y-24 text-text1">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-center">All Results</h1>
            {Object.keys(allRes).length > 0 ? (
              <AllResComponent allRes={allRes} />
            ) : (
              <p>No results to display.</p>
            )}
          </div>

          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-center">
              Grocery List
            </h1>
            {buyList.length > 0 ? (
              <BuyList buyList={buyList} id="" />
            ) : (
              <p>No items to display.</p>
            )}
          </div>

          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-center">
              Items that weren't found
            </h1>
            {allItems.length > 0 ? (
              <p>{allItems.join(", ")}</p>
            ) : (
              <p>No items to display.</p>
            )}
          </div>

          <div className="flex w-full justify-center">
            {allItems.length > 0 ? (
              <button
                id="re_generate_btn"
                onClick={() => generateAPIHandler("re_generate_btn")}
                className="bg-pri_btn1 px-16 py-4 rounded border border-text1 text-xl font-medium transition ease-in-out duration:500 hover:bg-transparent hover:text-text1 hover:scale-110 hover:-translate-y-1"
              >
                {isLoading2
                  ? "Loading..."
                  : "Find missing items without filtering"}
              </button>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
