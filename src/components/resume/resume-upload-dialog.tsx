"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";

import { uploadResumeAction } from "@/actions/resume";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { IDLE_ACTION_STATE } from "@/types/action";

export function ResumeUploadDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    uploadResumeAction,
    IDLE_ACTION_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload />
          Upload resume
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Upload a resume</DialogTitle>
            <DialogDescription>
              PDF or DOCX, up to 5 MB. We&apos;ll parse it and run an ATS score
              automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Senior Backend Engineer"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
            />
          </div>
          {state.status === "error" && (
            <FieldError messages={[state.message]} />
          )}
          <DialogFooter>
            <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
