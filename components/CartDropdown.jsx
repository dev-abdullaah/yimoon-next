// components/CartDropdown.jsx
'use client';

import Link from 'next/link';
import { useFloatingCart } from '@/context/CartContext';
import { cartLinePath } from '@/utils/urlHelper';
import { PLACEHOLDER_IMAGE } from '@/lib/api';
import DeleteIcon from '@/components/Icons/DeleteIcon';

/**
 * The cart summary that drops down from the header.
 *
 * The lines come from the API already priced and already checked against live
 * stock, so nothing here recomputes a total. The stepper operates on the cart
 * *item* id, which is what the quantity endpoints address — a product id would
 * update whichever line happened to match first.
 */
export default function CartDropdown() {
  const {
    cartItems,
    total,
    subtotal,
    itemCount,
    formatCurrency,
    removeItemById,
    increaseQty,
    decreaseQty
  } = useFloatingCart();

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
              <div className="flex justify-between items-center gap-x-4 px-4 py-3 relative overflow-hidden">
                <div className="flex items-center gap-3 text-dark-ash text-xs md:text-sm min-w-0 flex-1">
                  <Link
                    href={cartLinePath(item)}
                    className="shrink-0 w-[90px] h-[90px] rounded-sm overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100"
                  >
                    <img
                      alt={item.name}
                      loading="lazy"
                      width="90"
                      height="90"
                      decoding="async"
                      className="w-full h-full object-cover rounded-sm cursor-pointer"
                      src={item.image || PLACEHOLDER_IMAGE}
                      onError={(e) => {
                        e.target.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                  </Link>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-dark-ash">SN. {index + 1}</p>
                    <Link href={cartLinePath(item)}>
                      <p className="text-dark font-semibold capitalize hover:text-primary line-clamp-2 leading-tight">
                        {item.name}
                      </p>
                    </Link>
                    {item.attributeLabel && (
                      <p className="text-dark-ash">
                        Option : <span className="font-semibold text-dark">{item.attributeLabel}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs md:text-sm">
                      <span className="text-dark-ash">Unit Price :</span>
                      <span className="font-semibold text-dark">
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs md:text-sm">
                      <span className="text-dark-ash">Amount :</span>
                      <span className="font-semibold text-dark">
                        {formatCurrency(item.lineTotal)}
                      </span>
                    </div>
                    {!item.available && (
                      <p className="text-danger font-medium text-xs">
                        No longer available — remove to continue
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 my-auto space-y-2">
                  <div className="rounded border sm:border-2 border-primary flex justify-around items-center text-primary w-24 3xl:w-28 h-8">
                    <button
                      type="button"
                      disabled={item.quantity <= 1}
                      aria-label="decrease-quantity"
                      className="font-semibold p-3 disabled:text-light-ash"
                      onClick={() => decreaseQty(item.id)}
                    >
                      <svg width="11" height="4" viewBox="0 0 11 4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.958 0.456468V3.99647H0.367982V0.456468H10.958Z" />
                      </svg>
                    </button>
                    <p className="font-bold text-base w-6 text-center">{item.quantity}</p>
                    <button
                      type="button"
                      disabled={!item.available || item.quantity >= item.maxQuantity}
                      aria-label="increase-quantity"
                      className="font-semibold p-3 disabled:text-light-ash"
                      onClick={() => increaseQty(item.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.00675 0.256467V12.6645H5.29475V0.256467H8.00675ZM12.5907 5.20047V7.69647H0.686747V5.20047H12.5907Z" />
                      </svg>
                    </button>
                  </div>
                  <button
                    className="w-full flex justify-center items-center py-1 text-light-ash hover:text-danger"
                    type="button"
                    aria-label="delete-cart-product"
                    onClick={() => removeItemById(item.id, item.name)}
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
          <div className="text-dark-ash text-lg font-semibold flex justify-end items-center gap-1.5">
            <span>Sub-Total :</span>
            <span className="text-dark">{formatCurrency(subtotal)}</span>
          </div>
          {total !== subtotal && (
            <div className="text-dark-ash text-lg font-semibold flex justify-end items-center gap-1.5 pt-1">
              <span>Total :</span>
              <span className="text-dark">{formatCurrency(total)}</span>
            </div>
          )}
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
