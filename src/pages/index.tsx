import Image from "next/image";
import { Inter } from "next/font/google";
import { SetStateAction, useEffect, useRef, useState } from "react";
import path from "path";
import { promises as fs } from "fs";
import { stringify } from "querystring";
import { text } from "stream/consumers";
import Link from "next/link";
import ReactLoading from "react-loading";
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
    <div className="flex-col">
      <h1 className="text-5xl font-medium text-white mb-8">All Results</h1>
      <div className="flex-col space-y-2">
        {Object.keys(allRes).map((key) => (
          <div key={key} className="capitalize">
            <Link
              href={`https://www.woolworths.com.au/shop/search/products?searchTerm=${key}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <p className="text-3xl font-normal text-white transition ease-in-out duration-500  hover:font-medium mb-2">
                {key}
              </p>
            </Link>
            <BuyList buyList={allRes[key]} id={"AllRes"} />
          </div>
        ))}
      </div>
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
    <div className="flex-col space-y-6">
      <div className="flex overflow-x-auto space-x-4 p-4">
        {buyList.map((item, index) => (
          <div
            key={index}
            className="flex flex-col bg-white rounded-lg p-4 shadow-md transition-transform duration-300 hover:scale-105"
            style={{
              minWidth: "200px",
              maxWidth: "200px",
              minHeight: "270px",
              maxHeight: "270px",
            }} // Adjust the width and height as needed
          >
            <div className="flex flex-col justify-between h-full overflow-auto">
              <div className="flex flex-col items-center">
                <img
                  src={item.image}
                  alt={item.product_name}
                  className="w-20 h-20 object-cover rounded-full"
                />
                <p className="text-center font-semibold">{item.product_name}</p>
              </div>
              <div className="flex flex-col mt-auto items-center">
                <p className="text-gray-600">Price: ${item.price}</p>
                <p className="text-gray-600">
                  Cup Price: ${item.cup_price}/{item.cup}
                </p>
                <Link href={item.stockcode} className="text-blue-500 underline">
                  Link to the product
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Only show price if it's the grocery list */}
      {totalPrice > 0 && (
        <div className="text-center">
          <p className="text-2xl font-bold text-accent1">
            Total Price: ${totalPrice.toFixed(2)}
          </p>
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
    "Calcium `dis`odium EDTA",
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
  const [isProductFound, setIsProductFound] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRef1 = useRef<HTMLDivElement>(null);

  const textAreaHandler = (event: {
    target: { value: SetStateAction<String | undefined> };
  }) => {
    setValue(event.target.value);
  };

  // function scrollToPrompt() {
  //   if (!isBrowser()) return;
  //   window.scrollTo({ top: 1000, behavior: "smooth" });
  // }

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [buyList]);

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
      setIsProductFound(true);

      requestBody = {
        prompt: value as string,
        filter: true,
        top: top,
        badList: badList,
      };
    }

    console.log(requestBody);
    // http://127.0.0.1:5000/get_product
    // https://grecy-api.vercel.app/get_product
    fetch("https://grecy-api.vercel.app/get_product", {
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
        console.log(data);
        console.log(data.filter);

        if (Object.keys(data.all_res).length === 0) {
          console.log("empty");
          setIsProductFound(false);
        }
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
      {/* <div className="flex min-h-screen w-full bg-bg1" id="main_screen">
        <div className="flex-col h-screen w-2/5 space-y-8 pl-48 py-64" id="left">
          <p className="flex text-9xl font-bold text-accent1" id="name">
            Grecy
          </p>
          <p className="flex text-2xl font-normal w-5/5 text-text1" id="desc">
            Discover healthier shopping at Woolworths. Find products free from
            harmful ingredients easily. Shop confidently for your well-being.{" "}
          </p>
          <button
            onClick={() => {
              if (scrollRef1.current) {
                scrollRef1.current.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="flex text-2xl font-normal bg-pri_btn1 text-white px-6 py-2 border border-white rounded transition duration-500 ease-in-out hover:bg-transparent hover:text-text1 hover:-translate-y-1"
            id="main_btn"
          >
            Try Now!
          </button>
        </div>
        <div
          className="flex h-screen w-3/5 justify-center items-center bg-bg1 "
          id="right"
        >
          <div className="flex w-[750px] h-[750px] sm:scale-75 md:scale-75 lg:scale-100 shrink-0 grow-0 justify-center items-center bg-accent1 rounded-full">
            <div
              className='flex h-2/3 w-2/3 justify-end items-end bg-[url("/cart.png")] bg-cover bg-center'
              id="img"
            >
              <div
                className='flex h-1/2 w-1/2 justify-end bg-[url("/bag.png")] bg-cover bg-center my-5'
                id="img2"
              ></div>
            </div>
          </div>
        </div>
      </div> */}

      <div className="min-h-screen bg-bg1 flex flex-col justify-center items-center sm:pl-10">
        <p className="text-6xl sm:text-8xl font-bold text-accent1" id="name">
          Grecy
        </p>
        <p
          className="text-xl sm:text-3xl text-center w-full text-text1 my-8 px-4 sm:px-16"
          id="desc"
        >
          Discover healthier shopping at Woolworths. Find products free from
          harmful ingredients easily. Shop confidently for your well-being.
        </p>
        <button
          onClick={() => {
            if (scrollRef1.current) {
              scrollRef1.current.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="text-xl sm:text-2xl bg-pri_btn1 text-white px-6 py-2 border border-white rounded transition duration-500 ease-in-out hover:bg-transparent hover:text-text1 hover:-translate-y-1"
          id="main_btn"
        >
          Try Now!
        </button>
      </div>

      <div
        className="flex flex-col h-full items-center justify-center bg-bg1"
        id="prompt"
        ref={scrollRef1}
      >
        <div className="flex h-full w-full">
          <div className="flex-col h-full w-full py-8 px-10 space-y-6 bg-accent1">
            <p className="flex-wrap w-half text-white text-3xl font-medium text-center justify-center">
              Enter your recipe <br></br>
              <span className="text-sm leading-3">
                (Example: 1 tsp (5ml) - Olive Oil, 600g (1.32lbs) - Chicken
                Thigh, Boneless & Skinless, 1 1/2 tsp (4g) - Onion Powder, 1 1/2
                tsp (4g) - Garlic Powder, 1 1/2 tsp (4g) - Smoked Paprika)
              </span>
            </p>

            <div className="flex w-full justify-center">
              <textarea
                onChange={textAreaHandler}
                onKeyDown={handleKeyDown}
                id="prompt"
                rows={10}
                maxLength={1000}
                className="border rounded-md text-text1 w-full sm:w-3/4 text-lg p-4 max-h-32 sm:max-h-max"
                placeholder="Enter your recipe"
              ></textarea>
            </div>

            <div className="mb-4">
              <label
                htmlFor="badList"
                className="flex lock text-white mb-2 font-medium text-gray-700 text-center justify-center "
              >
                Ingredients you do not want to include
              </label>
            </div>
            <div className="flex w-full justify-center">
              <textarea
                id="badList"
                value={badList.join(", ")}
                rows={3}
                maxLength={1000}
                className="w-full sm:w-3/4 text-text1 px-3 h-32 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 max-h-20 sm:max-h-max"
                onChange={handleBadListChange}
              />
            </div>
            <div className="flex w-full justify-center">
              <button
                id="bad_list_btn"
                type="submit"
                onClick={() => badListHandler()}
                className="bg-sec_btn1 text-text1 px-8 py-2 rounded border border-text1 text-xl font-medium transition ease-in-out duration:500 hover:scale-110"
              >
                Set default filtering
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-w-xs mx-auto">
              <div className="mb-4">
                <label
                  htmlFor="number"
                  className="block mb-2 text-white font-medium text-gray-700 text-center"
                >
                  Enter number of products per ingredient
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
                disabled={isLoading}
                id="generate_btn"
                type="submit"
                onClick={() => generateAPIHandler("generate_btn")}
                className="bg-sec_btn1 text-text1 px-8 py-2 rounded border border-text1 text-xl font-medium transition ease-in-out duration:500 hover:scale-110"
              >
                {!isProductFound ? (
                  "Product Not Found"
                ) : isLoading ? (
                  <ReactLoading type="spin" color="" height={20} width={20} />
                ) : (
                  "Find!"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {buyList.length > 0 && (
        <div className="flex h-fit w-full bg-bg1 py-16" ref={scrollRef}>
          <div className="flex-col w-full sm:px-20 space-y-14 text-text1">
            <div className="flex-col">
              {Object.keys(allRes).length > 0 && (
                <div className="bg-accent1 py-16 px-5 sm:p-16 sm:rounded-lg">
                  <AllResComponent allRes={allRes} />
                </div>
              )}
            </div>

            <div className="flex-col px-4">
              {buyList.length > 0 && (
                <div className="flex-col" id="wrapper">
                  <h1 className="text-5xl font-medium text-accent1 mb-8">
                    Grocery List
                  </h1>
                  <BuyList buyList={buyList} id="" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {allItems.length > 0 && (
        <div className="bg-accent1 py-16 px-5 sm:p-16 ">
          <div className="">
            <div className="flex-col">
              <h1 className="text-2xl font-medium text-white">
                Items that were not found
              </h1>
              <p className="py-4 text-white">
                {allItems.join(", ").charAt(0).toUpperCase() +
                  allItems.join(", ").slice(1)}
              </p>
            </div>
          </div>
          <div className="flex w-full justify-center">
            <button
              disabled={isLoading2}
              id="re_generate_btn"
              onClick={() => generateAPIHandler("re_generate_btn")}
              className="bg-sec_btn1 text-text1 px-8 py-2 rounded border border-text1 text-xl font-medium transition ease-in-out duration:500 hover:scale-110"
            >
              {isLoading2 ? "Loading..." : "Find missing items unfiltered"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
