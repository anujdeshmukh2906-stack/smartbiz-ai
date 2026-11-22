import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Package, X } from "lucide-react";
import type { Product } from "../server/domain";
import "./product-details.css";

type CatalogProduct = Product & {
  brand?: string;
  packSize?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  productType?: string;
  description?: string;
  ingredients?: string;
  allergens?: string;
  storage?: string;
  mrp?: number;
  sourceUrl?: string;
  sourceLabel?: string;
  verifiedAt?: string;
  imageSourceUrl?: string;
  catalogVersion?: number;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

function ProductDetailsPhoto({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.image]);
  return (
    <span className="product-photo" aria-label={product.name}>
      {product.image && !failed ? (
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package size={48} />
      )}
    </span>
  );
}

function webLink(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function checkedDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}

export function ProductDetails({
  product,
  onClose,
}: {
  product: CatalogProduct;
  onClose: () => void;
}) {
  const titleId = useId();
  const noteId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const source = webLink(product.sourceUrl);
  const imageSource = webLink(product.imageSourceUrl);
  const checked = checkedDate(product.verifiedAt);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", keydown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  const facts: [string, string | undefined][] = [
    ["Brand", product.brand],
    ["Pack size", product.packSize],
    ["Product type", product.productType],
    ["Manufacturer / marketer", product.manufacturer],
    ["Country of origin", product.countryOfOrigin],
    ["Shop SKU", product.barcode],
  ];

  return createPortal(
    <div
      className="product-details-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="product-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
      >
        <div className="product-details-toolbar">
          <span>
            <Package size={16} aria-hidden="true" /> Product details
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close product details"
            onClick={onClose}
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="product-details-body">
          <div className="product-details-visual">
            <ProductDetailsPhoto product={product} />
            {imageSource && (
              <a
                className="product-details-image-source"
                href={imageSource}
                target="_blank"
                rel="noopener noreferrer"
              >
                View image source <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="product-details-information">
            <div className="product-details-brandline">
              {product.brand && <span>{product.brand}</span>}
              <small>{product.category}</small>
            </div>
            <h2 id={titleId}>{product.name}</h2>
            {product.packSize && (
              <p className="product-details-pack">{product.packSize}</p>
            )}
            {product.description && (
              <p className="product-details-description">
                {product.description}
              </p>
            )}
            <div className="product-details-pricing">
              <div>
                <small>Shop selling price</small>
                <strong>{money(product.price)}</strong>
              </div>
              {typeof product.mrp === "number" && product.mrp > 0 && (
                <div className="product-details-reference-price">
                  <small>Source-listed MRP</small>
                  <b>{money(product.mrp)}</b>
                  <span>Reference value · check the current pack</span>
                </div>
              )}
            </div>
            <dl className="product-details-facts">
              {facts
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
        {(product.ingredients || product.allergens || product.storage) && (
          <div className="product-details-label-info">
            {product.ingredients && (
              <section>
                <h3>Ingredients</h3>
                <p>{product.ingredients}</p>
              </section>
            )}
            {product.allergens && (
              <section>
                <h3>Allergen information</h3>
                <p>{product.allergens}</p>
              </section>
            )}
            {product.storage && (
              <section>
                <h3>Storage</h3>
                <p>{product.storage}</p>
              </section>
            )}
          </div>
        )}
        <footer className="product-details-footer">
          {source && (
            <div className="product-details-source-row">
              <a href={source} target="_blank" rel="noopener noreferrer">
                {product.sourceLabel || "View product source"}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              {checked && <span>Details checked {checked}</span>}
            </div>
          )}
          <p id={noteId}>
            Packaging and product information can change. Check the actual pack
            for the latest ingredients, allergens, storage instructions and MRP.
            Shop prices are managed separately from published reference prices.
          </p>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
