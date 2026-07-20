import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ResumeData } from "@/features/resume/schema";

import { CertificationsProjectsSection } from "./certifications-projects-section";
import { ContactSection } from "./contact-section";
import { EducationSection } from "./education-section";
import { ExperienceSection } from "./experience-section";
import { SkillsSection } from "./skills-section";

export function ResumeBuilderEditor({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}) {
  return (
    <Tabs defaultValue="contact">
      <TabsList className="flex-wrap">
        <TabsTrigger value="contact">Contact</TabsTrigger>
        <TabsTrigger value="experience">Experience</TabsTrigger>
        <TabsTrigger value="education">Education</TabsTrigger>
        <TabsTrigger value="skills">Skills</TabsTrigger>
        <TabsTrigger value="more">Certs & Projects</TabsTrigger>
      </TabsList>

      <TabsContent value="contact">
        <ContactSection data={data} onChange={onChange} />
      </TabsContent>
      <TabsContent value="experience">
        <ExperienceSection data={data} onChange={onChange} />
      </TabsContent>
      <TabsContent value="education">
        <EducationSection data={data} onChange={onChange} />
      </TabsContent>
      <TabsContent value="skills">
        <SkillsSection data={data} onChange={onChange} />
      </TabsContent>
      <TabsContent value="more">
        <CertificationsProjectsSection data={data} onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
}
