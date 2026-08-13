export const mapEvent = (event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    latitude: event.latitude,
    longitude: event.longitude,
    date: event.date,
    image: event.image,
    price: parseFloat(event.price),
    status: event.status,
    category: event.category,
    sources: event.sources,
});