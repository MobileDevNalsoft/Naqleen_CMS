import type { ContainerType } from './containerTypes';

export interface CustomerBooking {
    cust_name: string;
    bookings: {
        booking_id: string;
        container_types: ContainerType[];
    }[];
}
