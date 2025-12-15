// Standard API Response Wrapper
export interface ApiResponse<T> {
    response_code: number;
    response_message: string;
    data: T;
}
