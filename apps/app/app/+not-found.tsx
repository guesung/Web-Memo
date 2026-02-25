import { Redirect } from "expo-router";

export default function NotFound() {
	return (
		<Redirect href={{ pathname: "/(main)", params: { filter: "wish" } }} />
	);
}
