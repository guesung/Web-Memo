import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "webmemo:favorites";

export interface Favorite {
	id: string;
	url: string;
	title: string;
	favIconUrl?: string;
	createdAt: string;
}

async function getAll(): Promise<Favorite[]> {
	const raw = await AsyncStorage.getItem(FAVORITES_KEY);
	if (!raw) return [];
	return JSON.parse(raw) as Favorite[];
}

async function save(favorites: Favorite[]) {
	await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export async function getAllFavorites(): Promise<Favorite[]> {
	const favorites = await getAll();
	return favorites.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
}

export async function addFavorite(params: {
	url: string;
	title: string;
	favIconUrl?: string;
}): Promise<Favorite> {
	const favorites = await getAll();
	const existing = favorites.find((f) => f.url === params.url);
	if (existing) return existing;

	const newFav: Favorite = {
		id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		url: params.url,
		title: params.title,
		favIconUrl: params.favIconUrl,
		createdAt: new Date().toISOString(),
	};
	favorites.push(newFav);
	await save(favorites);
	return newFav;
}

export async function removeFavorite(url: string): Promise<void> {
	const favorites = await getAll();
	await save(favorites.filter((f) => f.url !== url));
}

export async function isFavorite(url: string): Promise<boolean> {
	const favorites = await getAll();
	return favorites.some((f) => f.url === url);
}
