import { atom, computed } from "nanostores";

export const selectedEmailId = atom<string | null>(null);
export const isPreviewOpen = atom(false);

export const hasSelectedEmail = computed(selectedEmailId, (id) => id !== null);

export const openPreview = (emailId: string | null) => {
	if (!emailId) return;
	console.log("Opening preview for email:", emailId);
	selectedEmailId.set(emailId);
	isPreviewOpen.set(true);
};

export const closePreview = () => {
	console.log("Closing preview");
	isPreviewOpen.set(false);
	// Add a small delay before clearing the selected email
	setTimeout(() => {
		selectedEmailId.set(null);
	}, 300); // Matches the transition duration
};
