import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string) => void;
}

export function CreatePlaylistModal({ open, onOpenChange, onCreate }: Props) {
    const [name, setName] = useState("");

    const handleCreate = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onCreate(trimmed);
        setName("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-white">Create New Playlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Input
                        placeholder="Playlist name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!name.trim()}
                            className="bg-[#1DB954] hover:bg-[#1ed760] text-black"
                        >
                            Create
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}