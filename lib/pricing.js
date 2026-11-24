'use strict';
// Shared pricing engine used by the live server and the seed generator.
const GST_RATE = 0.05;
const PLATFORM_FEE = 5;
const DELIVERY_FEE = 35;
const FREE_DELIVERY_ABOVE = 499;
const POINT_VALUE = 1;          // 1 FoodPoint = Rs 1
const MAX_POINTS_SHARE = 0.2;   // points can cover at most 20% of subtotal

function evalCoupon(coupon, subtotal) {
  if (!coupon) return { discount: 0, freeDelivery: false };
  if (subtotal < coupon.min) return { error: `Add Rs ${coupon.min - subtotal} more to use ${coupon.code}` };
  if (coupon.type === 'percent') return { discount: Math.min(Math.round(subtotal * coupon.value / 100), coupon.max || Infinity), freeDelivery: false };
  if (coupon.type === 'flat') return { discount: Math.min(coupon.value, subtotal), freeDelivery: false };
  if (coupon.type === 'freedel') return { discount: 0, freeDelivery: true };
  return { discount: 0, freeDelivery: false };
}

function price({ lines, coupon, tip = 0, pointsAvailable = 0, usePoints = false }) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const c = evalCoupon(coupon, subtotal);
  const couponError = c.error || null;
  const discount = c.error ? 0 : c.discount;
  const freeDel = !c.error && c.freeDelivery;
  const deliveryFee = (freeDel || subtotal >= FREE_DELIVERY_ABOVE || subtotal === 0) ? 0 : DELIVERY_FEE;
  const afterDiscount = Math.max(subtotal - discount, 0);
  let pointsUsed = 0;
  if (usePoints) pointsUsed = Math.max(0, Math.min(pointsAvailable, Math.floor(afterDiscount * MAX_POINTS_SHARE / POINT_VALUE)));
  const tax = Math.round((afterDiscount - pointsUsed * POINT_VALUE) * GST_RATE);
  const platformFee = subtotal ? PLATFORM_FEE : 0;
  const tipAmt = Math.max(0, Math.min(Math.round(tip) || 0, 500));
  const total = afterDiscount - pointsUsed * POINT_VALUE + tax + deliveryFee + platformFee + tipAmt;
  return { subtotal, discount, couponError, deliveryFee, platformFee, tax, tip: tipAmt, pointsUsed, pointsDiscount: pointsUsed * POINT_VALUE, total, freeDeliveryThreshold: FREE_DELIVERY_ABOVE, pointsEarned: Math.floor(total / 20) };
}

module.exports = { price, evalCoupon, GST_RATE, PLATFORM_FEE, DELIVERY_FEE, FREE_DELIVERY_ABOVE };
