"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  ResumeCertification,
  ResumeData,
  ResumeProject,
} from "@/features/resume/schema";

const EMPTY_CERTIFICATION: ResumeCertification = {
  name: "",
  issuer: null,
  date: null,
};

const EMPTY_PROJECT: ResumeProject = {
  name: "",
  description: null,
  bullets: [],
  link: null,
};

export function CertificationsProjectsSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}) {
  function updateCertification(index: number, patch: Partial<ResumeCertification>) {
    onChange({
      ...data,
      certifications: data.certifications.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function updateProject(index: number, patch: Partial<ResumeProject>) {
    onChange({
      ...data,
      projects: data.projects.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Certifications</h3>
        {data.certifications.map((cert, index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`cert-name-${index}`}>Name</Label>
                    <Input
                      id={`cert-name-${index}`}
                      value={cert.name}
                      onChange={(event) => updateCertification(index, { name: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`cert-issuer-${index}`}>Issuer</Label>
                    <Input
                      id={`cert-issuer-${index}`}
                      value={cert.issuer ?? ""}
                      onChange={(event) => updateCertification(index, { issuer: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`cert-date-${index}`}>Date</Label>
                    <Input
                      id={`cert-date-${index}`}
                      placeholder="2023-04"
                      value={cert.date ?? ""}
                      onChange={(event) => updateCertification(index, { date: event.target.value })}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    onChange({
                      ...data,
                      certifications: data.certifications.filter(
                        (_, entryIndex) => entryIndex !== index,
                      ),
                    })
                  }
                  aria-label={`Remove ${cert.name || "this certification"}`}
                  className="mt-6 shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() =>
            onChange({ ...data, certifications: [...data.certifications, EMPTY_CERTIFICATION] })
          }
        >
          <Plus />
          Add certification
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Projects</h3>
        {data.projects.map((project, index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Label htmlFor={`project-name-${index}`}>Name</Label>
                  <Input
                    id={`project-name-${index}`}
                    className="mt-1.5"
                    value={project.name}
                    onChange={(event) => updateProject(index, { name: event.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    onChange({
                      ...data,
                      projects: data.projects.filter((_, entryIndex) => entryIndex !== index),
                    })
                  }
                  aria-label={`Remove ${project.name || "this project"}`}
                  className="mt-6 shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`project-description-${index}`}>Description</Label>
                <Textarea
                  id={`project-description-${index}`}
                  rows={3}
                  value={project.description ?? ""}
                  onChange={(event) => updateProject(index, { description: event.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => onChange({ ...data, projects: [...data.projects, EMPTY_PROJECT] })}
        >
          <Plus />
          Add project
        </Button>
      </div>
    </div>
  );
}
