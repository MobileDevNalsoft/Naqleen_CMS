export const MOCK_CUSTOMERS_AND_BOOKINGS = {
    "response_message": "Success",
    "response_code": 200,
    "data": [
        {
            "customer_name": "ADVANCED POWER LOGISTICS",
            "bookings": [
                {
                    "booking_id": "123456",
                    "container_types": [
                        { "container_type": "20GP", "container_count": 15 },
                        { "container_type": "40HC", "container_count": 22 }
                    ]
                },
                {
                    "booking_id": "ASAD7878",
                    "container_types": [
                        { "container_type": "40GP", "container_count": 18 },
                        { "container_type": "20GP", "container_count": 12 }
                    ]
                },
                {
                    "booking_id": "05524",
                    "container_types": [
                        { "container_type": "40HC", "container_count": 30 }
                    ]
                }
            ]
        },
        {
            "customer_name": "MAERSK LINE",
            "bookings": [
                {
                    "booking_id": "MSK25",
                    "container_types": [
                        { "container_type": "40HC", "container_count": 26 },
                        { "container_type": "20GP", "container_count": 15 }
                    ]
                }
            ]
        },
        {
            "customer_name": "MSC",
            "bookings": [
                {
                    "booking_id": "GEN1915635",
                    "container_types": [
                        { "container_type": "20GP", "container_count": 18 },
                        { "container_type": "40GP", "container_count": 24 }
                    ]
                }
            ]
        }
    ]
};

export const generateRecommendedContainers = (bookingId: string, requirements: { container_type: string, container_count: number }[]) => {
    return requirements.map(req => {
        const containers = [];
        for (let i = 0; i < req.container_count; i++) {
            // Generate a random-ish container number based on type and index
            const prefix = req.container_type.substring(0, 2) === '20' ? 'MSKU' : 'TGHU';
            const randomNum = Math.floor(Math.random() * 900000) + 100000;
            containers.push(`${prefix} ${randomNum}-${Math.floor(Math.random() * 9)}`);
        }
        return {
            container_type: req.container_type,
            recommended_containers: containers
        };
    });
};

export const generateSwapCandidates = (type: string, query: string) => {
    // Generate 5 random candidates matching the type and query
    return Array.from({ length: 5 }).map((_, i) => {
        const prefix = type.startsWith('20') ? 'MSKU' : 'TGHU';
        const randomNum = Math.floor(Math.random() * 900000) + 100000;
        return {
            container_nbr: `${prefix} ${query ? query.toUpperCase() : randomNum}-${i}`,
            container_type: type,
            position: `Block ${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}, Row ${Math.floor(Math.random() * 10)}`
        };
    });
};
