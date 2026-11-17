import React from 'react';
import { FlowSkeleton } from './FlowSkeleton';
export function BookingCardSkeleton({count=2}:{count?:number}) { return <FlowSkeleton kind="card" count={count}/>; }
