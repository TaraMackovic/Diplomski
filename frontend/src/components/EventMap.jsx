import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function EventMap({ latitude, longitude, title, location }) {
    if (!latitude || !longitude) {
        return null;
    }

    const position = [parseFloat(latitude), parseFloat(longitude)];

    return (
        <MapContainer
            center={position}
            zoom={15}
            scrollWheelZoom={false}
            className="event-map"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position} icon={defaultIcon}>
                <Popup>
                    <strong>{title}</strong>
                    <br />
                    {location}
                </Popup>
            </Marker>
        </MapContainer>
    );
}

export default EventMap;