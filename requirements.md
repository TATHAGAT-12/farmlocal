## Packages
recharts | Data visualization for system status
framer-motion | Smooth animations for UI elements

## Notes
The API uses cursor-based pagination for products ({ items: [], nextCursor: string }).
System status endpoints need polling (useQuery refetchInterval).
Simulated integration endpoints need to handle potential 503 errors (circuit breaker).
Dark mode support is required by design guidelines.
