/** Muted, Snapchat-ish palette for Google Maps (Android / iOS with Google provider). */
export const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f2efe9' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a857c' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b6862' }],
  },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e6e2d8' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dde8d3' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fbfaf7' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#efece3' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9a958c' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d8e2' }] },
];
