import { Image, StyleSheet } from "react-native";

interface CastBackdropProps {
  imageUrl?: string;
}

// Blurred poster shown behind the player while casting (the TV is the display).
const CastBackdrop: React.FC<CastBackdropProps> = ({ imageUrl }) => {
  if (!imageUrl) return null;
  return (
    <Image
      source={{ uri: imageUrl }}
      style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
      resizeMode="cover"
      blurRadius={20}
    />
  );
};

export default CastBackdrop;
