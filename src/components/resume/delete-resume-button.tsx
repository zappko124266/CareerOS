"use client";

import { Trash2 } from "lucide-react";

import { deleteResumeAction } from "@/actions/resume";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteResumeButton({ resumeId }: { resumeId: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Delete resume"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the file and all of its analyses. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={deleteResumeAction}>
          <input type="hidden" name="resumeId" value={resumeId} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
