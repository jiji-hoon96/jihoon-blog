import { siteMetadata } from "@/lib/site-metadata";
import Utterances from "@/components/Utterances";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guestbook",
  description: "방명록 - 자유롭게 방명록을 작성해주세요",
};

export default function GuestbookPage() {
  return (
    <div className="py-12">
      {/* Guestbook Banner */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">안녕하세요!</h1>
        <p className="text-lg text-light-gray80 dark:text-dark-gray80">
          자유롭게 방명록을 작성해주세요 :)
        </p>
      </div>

      {/* Utterances Comments */}
      <Utterances
        repo={siteMetadata.comments.utterances.repo}
        path="guestbook"
      />
    </div>
  );
}
