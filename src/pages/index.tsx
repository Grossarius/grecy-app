import Image from "next/image";
import { Inter } from "next/font/google";
import { SetStateAction, useEffect, useState } from "react";
import path from "path";
import { promises as fs } from "fs";
import { stringify } from "querystring";

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

function AllResComponent({ allRes }: { allRes: AllRes }) {
  return (
    <div className="my-8">
      {Object.keys(allRes).map((key) => (
        <div key={key} className="mb-4">
          <h2 className="text-2xl font-bold mb-2">{key}</h2>
          <BuyList buyList={allRes[key]} />
        </div>
      ))}
    </div>
  );
}

function BuyList({ buyList }: { buyList: Product[] }) {
  return (
    <div className="flex overflow-x-auto space-x-4">
      {buyList.map((item, index) => (
        <div
          key={index}
          className="flex flex-col items-center bg-white rounded-lg p-4 shadow"
        >
          <img
            src={item.image}
            alt={item.product_name}
            className="w-24 h-24 object-cover rounded-full"
          />
          <p className="text-center font-semibold">{item.product_name}</p>
          <p className="text-gray-600">Price: {item.price}</p>
          <p className="text-gray-600">
            Cup Price: {item.cup_price}/{item.cup}
          </p>
          <a href={item.stockcode} className="text-blue-500 underline">
            {item.stockcode}
          </a>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const isBrowser = () => typeof window !== "undefined";
  const [value, setValue] = useState<String>();
  // const [allRes, setAllRes] = useState<Record<string, any>>({});
  const [allRes, setAllRes] = useState<AllRes>({});
  // const [buyList, setBuyList] = useState<Record<string, any>[]>([]);
  const [buyList, setBuyList] = useState<Product[]>([]);
  const [allNone, setAllNone] = useState<Record<string, string[]>>({});

  const [display, setDisplay] = useState();

  const textAreaHandler = (event: {
    target: { value: SetStateAction<String | undefined> };
  }) => {
    setValue(event.target.value);
  };

  function scrollToPrompt() {
    if (!isBrowser()) return;
    window.scrollTo({ top: 1000, behavior: "smooth" });
  }

  async function generateAPIHandler() {
    console.log(value);

    fetch("http://127.0.0.1:5000/get_product", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: value,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setAllRes(data.all_res);
        setBuyList(data.buy_list);
        setAllNone(data.all_none);
      })
      .catch((error) => console.log(error));
  }

  function displayItem(items: {}) {
    return <div className="flex-shrink-0 h-64 w-64  bg-center bg-cover"></div>;
  }

  function displayRows(items: {}) {
    return (
      <div className="flex-col">
        <label className="text-text1 font-medium text-3xl">{}</label>
        <div className="overflow-x-scroll flex w-full space-x-12">
          <div className="flex-shrink-0 h-64 w-64 bg-gray-600"></div>
        </div>
      </div>
    );
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
            className="flex text-2xl font-normal bg-pri_btn1 px-6 py-2 border border-text1 rounded transition ease-in-out duration:500 hover:bg-transparent hover:text-text1 hover:scale-110 hover:-translate-y-1"
            id="main_btn"
          >
            Try Now!
          </button>
        </div>
        <div className="flex h-full w-3/5 bg-accent1" id="right">
          <div className="flex py-48 px-32">
            <div
              className='flex h-[520px] w-[520px] bg-[url("/cart.png")] bg-cover bg-center'
              id="img"
            ></div>
            <div
              className='flex h-[320px] w-[320px] bg-[url("/bag.png")] bg-cover bg-center -mx-32 my-48'
              id="img2"
            ></div>
          </div>
        </div>
      </div>

      <div className="flex-col h-screen w-full bg-bg1" id="prompt">
        <div className="flex h-1/6 w-full bg-accent1"></div>
        <div className="flex-col h-5/6 w-full py-20 px-96 space-y-4">
          <p className="flex w-full text-text1 text-2xl font-medium justify-center">
            Enter your recipe:
          </p>
          <textarea
            onChange={textAreaHandler}
            id="prompt"
            className="text-text1 w-full h-96 text-lg p-4"
            placeholder="Enter your recipe"
          >
            Testtest
          </textarea>
          <div className="flex w-full justify-center">
            <button
              id="generate_btn"
              onClick={generateAPIHandler}
              className="bg-pri_btn1 px-16 py-4 rounded border border-text1 text-xl font-medium transition ease-in-out duration:500 hover:bg-transparent hover:text-text1 hover:scale-110 hover:-translate-y-1"
            >
              Find!
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-fit w-full bg-green-100 px-32 py-32">
        <div className="flex-col w-full px-32 space-y-24">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-4">All Results</h1>
            {Object.keys(allRes).length > 0 ? (
              <AllResComponent allRes={allRes} />
            ) : (
              <p>No results to display.</p>
            )}
          </div>

          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-4">Grocery List</h1>
            {buyList.length > 0 ? (
              <BuyList buyList={buyList} />
            ) : (
              <p>No items to display.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
