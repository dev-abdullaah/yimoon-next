// components/CartDropdown.jsx
'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useFloatingCart } from '@/context/CartContext';
import DeleteIcon from '@/components/Icons/DeleteIcon';
import TakaIcon from '@/components/Icons/TakaIcon';

export default function CartDropdown() {
  const {
    cartItems,
    total,
    itemCount,
    formatCurrency,
    removeItemById,
    increaseQty,
    decreaseQty
  } = useFloatingCart();

  const handleRemoveItem = (e, id, name) => {
    e.preventDefault();
    e.stopPropagation();
    removeItemById(id, name);
  };

  const handleIncreaseQty = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    increaseQty(id);
  };

  const handleDecreaseQty = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    decreaseQty(id);
  };

  if (itemCount === 0) {
    return (
      <div className="absolute top-full right-0">
        <div className="border border-light-ash rounded-md w-[515px] bg-white shadow-2xl pt-1">
          <div className="py-8 flex flex-col justify-center items-center gap-2">
            <img
              alt="empty_cart"
              width="100"
              height="100"
              decoding="async"
              src="/resources/media/empty-cart.gif"
              style={{ color: 'transparent' }}
            />
            <p className="text-2xl uppercase font-bold">
              Empty <span className="text-primary">Cart !</span>
            </p>
            <p>Please add some product to the Cart</p>
            <Link
              className="bg-primary px-6 py-2 text-white font-medium rounded-md"
              href="/"
            >
              Go to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full right-0">
      <div className="border border-light-ash rounded-md w-[515px] bg-white shadow-2xl pt-1">
        <div className="overflow-auto h-96">
          {cartItems.map((item, index) => (
            <div key={`cart-item-${item.id}`}>
              <div className="flex justify-between gap-x-5 px-4 relative overflow-hidden">
                <div className="flex gap-2 text-dark-ash text-xs md:text-sm py-0">
                  <img
                    alt="Product Image"
                    loading="lazy"
                    width="90"
                    height="90"
                    decoding="async"
                    className="cursor-pointer rounded-sm my-auto"
                    src={item.image || ''}
                    style={{ color: 'transparent' }}
                    onError={(e) => {
                      e.target.src = '/resources/images/product_placeholder.jpg';
                    }}
                  />
                  <div className="py-2.5">
                    <p>SN. {index + 1}</p>
                    <p className="text-dark font-semibold capitalize">{item.name}</p>
                    {item.color && (
                      <p>Color : <span className="font-semibold">{item.color}</span></p>
                    )}
                    {item.size && (
                      <p>Size : <span className="font-semibold">{item.size}</span></p>
                    )}
                    <li className="flex items-center gap-2">
                      <p>Unit Price :</p>
                      <p className="flex items-center font-semibold text-dark text-sm">
                        {formatCurrency(item.price)}
                      </p>
                    </li>
                    <li className="flex items-center gap-2">
                      <p>Amount :</p>
                      <p className="flex items-center font-semibold text-dark text-sm">
                        {formatCurrency(item.qty * item.price)}
                      </p>
                    </li>
                  </div>
                </div>
                <div className="my-auto space-y-2">
                  <div className="rounded border sm:border-2 border-primary flex justify-around items-center text-primary w-24 3xl:w-28 h-8">
                    <button
                      type="button"
                      disabled={item.qty <= 1}
                      aria-label="decrease-quantity"
                      className="font-semibold p-3 disabled:text-light-ash"
                      onClick={(e) => {
                        handleDecreaseQty(e, item.id);
                        toast.success(`"${item.name}" removed from cart`);
                      }}
                    >
                      <svg width="11" height="4" viewBox="0 0 11 4" className="" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z"></path>
                      </svg>
                    </button>
                    <p className="font-bold text-base w-6 text-center">{item.qty}</p>
                    <button
                      type="button"
                      aria-label="increase-quantity"
                      className="font-semibold p-3 disabled:text-light-ash"
                      onClick={(e) => {
                        handleIncreaseQty(e, item.id);
                        toast.success(`"${item.name}" added to cart`);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" className="" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z"></path>
                      </svg>
                    </button>
                  </div>
                  <button
                    className="w-full"
                    type="button"
                    aria-label="delete-cart-product"
                    onClick={(e) => handleRemoveItem(e, item.id, item.name)}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
              {index < cartItems.length - 1 && (
                <hr className="mx-4 text-light-white block" />
              )}
            </div>
          ))}
        </div>
        <div className="shadow-custom1 px-4 py-3">
          <div className="text-dark-ash text-lg font-semibold flex justify-end items-center">
            Sub-Total :
            <span className="text-primary">
              <TakaIcon />
            </span>
            <span className="text-dark">{total}</span>
          </div>
          <div className="flex gap-2 pt-3">
            <Link
              href="/cart"
              className="border border-dark rounded-sm w-1/2 py-2 px-5 text-center text-base text-dark hover:shadow-lg hover:text-primary hover:border-primary"
            >
              View Cart <span>({itemCount})</span>
            </Link>
            <Link
              className="border border-primary rounded-sm w-1/2 py-2 px-5 text-center text-base bg-primary text-white hover:bg-dark-primary"
              href="/checkout"
            >
              Checkout Now <span>({itemCount})</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}