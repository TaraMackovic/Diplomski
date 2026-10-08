import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [44.7722, 17.191]; 
const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 15;

function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function Recenter({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.flyTo(position, Math.max(map.getZoom(), SELECTED_ZOOM));
    }, [position?.[0], position?.[1]]);
    return null;
}

function LocationPicker({ latitude, longitude, onPick }) {
    const hasPosition =
        latitude !== "" && longitude !== "" && latitude != null && longitude != null;
    const position = hasPosition ? [Number(latitude), Number(longitude)] : null;

    return (
        <div className="admin-map-wrapper">
            <MapContainer
                center={position || DEFAULT_CENTER}
                zoom={position ? SELECTED_ZOOM : DEFAULT_ZOOM}
                className="admin-map"
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickHandler onPick={onPick} />
                <Recenter position={position} />
                {position && <Marker position={position} />}
            </MapContainer>
        </div>
    );
}

export default LocationPicker;