import { getPublicData } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Contact } from "@/components/Contact";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const data = await getPublicData();
  return (
    <>
      <PageHeader
        cmd="echo $EMAIL"
        tag="contact"
        title="contact"
      />
      <section className="container-x pb-16">
        <Contact profile={data.profile} />
      </section>
    </>
  );
}
