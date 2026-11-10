'use client';import {useEffect} from 'react';import {useCart} from '@/components/cart';export default function ClearCart(){const clear=useCart(s=>s.clear);useEffect(()=>clear(),[clear]);return null}
