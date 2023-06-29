import Image from 'next/image'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <div className='Parent'>
      <div className='flex h-screen w-full bg-bg1' id='main_screen'>
        <div className='flex-col h-full w-2/5 space-y-8 pl-48 py-64' id='left'>
          <p className='flex text-8xl font-bold text-accent1' id='name'>Grocery</p>
          <p className='flex text-xl font-normal w-4/5 text-text1' id='desc'>ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem </p>
          <button className='flex text-2xl font-normal bg-pri_btn1 px-6 py-2 border border-text1 rounded transition ease-in-out duration:500 hover:bg-transparent hover:text-text1 hover:scale-110 hover:-translate-y-1' id='main_btn'>Try Now!</button>
        </div>
        <div className='flex h-full w-3/5 bg-accent1' id='right'>
          <div className='flex py-48 px-32'>
            <div className='flex h-[520px] w-[520px] bg-[url("/cart.png")] bg-cover bg-center' id='img'></div>
            <div className='flex h-[320px] w-[320px] bg-[url("/bag.png")] bg-cover bg-center -mx-32 my-48' id='img2'></div>
          </div>
         
        </div>
      </div>
    </div>
  )
}
