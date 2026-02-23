import { useEffect } from "react";
import { Dimensions } from "react-native";
import { PenLine } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { getFabPosition, saveFabPosition } from "@/lib/storage/browserPreferences";

const FAB_SIZE = 56;
const EDGE_MARGIN = 20;
const BOTTOM_SAFE_MARGIN = 70;
const SPRING_CONFIG = { damping: 15, stiffness: 200 };

interface DraggableFabProps {
  onPress: () => void;
  panelHeight: SharedValue<number>;
  bottomInset: number;
}

export function DraggableFab({ onPress, panelHeight, bottomInset }: DraggableFabProps) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const fabOffsetX = useSharedValue(screenWidth - FAB_SIZE - EDGE_MARGIN);
  const fabOffsetY = useSharedValue(screenHeight - FAB_SIZE - bottomInset - 80);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const maxY = screenHeight - FAB_SIZE - bottomInset - BOTTOM_SAFE_MARGIN;

  useEffect(() => {
    getFabPosition().then((pos) => {
      if (pos) {
        fabOffsetX.value = Math.min(pos.x, screenWidth - FAB_SIZE - EDGE_MARGIN);
        fabOffsetY.value = Math.min(pos.y, maxY);
      }
    });
  }, []);

  const persistPosition = (x: number, y: number) => {
    saveFabPosition({ x, y });
  };

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onStart(() => {
      dragStartX.value = fabOffsetX.value;
      dragStartY.value = fabOffsetY.value;
      isDragging.value = true;
    })
    .onUpdate((event) => {
      const newX = dragStartX.value + event.translationX;
      const newY = dragStartY.value + event.translationY;
      const minX = EDGE_MARGIN;
      const maxX = screenWidth - FAB_SIZE - EDGE_MARGIN;
      const minY = EDGE_MARGIN;
      fabOffsetX.value = Math.max(minX, Math.min(maxX, newX));
      fabOffsetY.value = Math.max(minY, Math.min(maxY, newY));
    })
    .onEnd(() => {
      isDragging.value = false;
      const centerX = fabOffsetX.value + FAB_SIZE / 2;
      const snapX =
        centerX < screenWidth / 2
          ? EDGE_MARGIN
          : screenWidth - FAB_SIZE - EDGE_MARGIN;
      fabOffsetX.value = withSpring(snapX, SPRING_CONFIG);
      runOnJS(persistPosition)(snapX, fabOffsetY.value);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (!isDragging.value) {
      runOnJS(onPress)();
    }
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    left: fabOffsetX.value,
    top:
      panelHeight.value > 0
        ? fabOffsetY.value - panelHeight.value
        : fabOffsetY.value,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        className="absolute items-center justify-center bg-foreground"
        style={[
          {
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 8,
            zIndex: 100,
          },
          fabAnimatedStyle,
        ]}
      >
        <PenLine size={24} color="#fff" />
      </Animated.View>
    </GestureDetector>
  );
}
