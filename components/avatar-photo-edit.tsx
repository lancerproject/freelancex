"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploadModal } from "@/components/photo-upload-modal";
import { saveAvatar } from "@/app/create-profile/actions";

// Purple pencil over the avatar that opens the full "Your photo" editor
// (crop / move / zoom / rotate + live previews) and saves on attach.
export function AvatarPhotoEdit() {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit photo"
        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border border-purple-200 bg-purple-50 text-purple-600 text-xs flex items-center justify-center hover:bg-purple-100"
      >
        ✎
      </button>
      <PhotoUploadModal
        open={open}
        onClose={() => setOpen(false)}
        onAttach={(url) => {
          start(async () => {
            await saveAvatar(url);
            router.refresh();
          });
        }}
      />
    </>
  );
}
