"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MemberForm } from "@/components/members/member-form";
import type { CreateMemberInput } from "@/lib/validation/member.schema";
import toast from "react-hot-toast";

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch(`/api/members/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setMember(j.data);
        else router.push("/members");
      })
      .catch(() => router.push("/members"))
      .finally(() => setFetching(false));
  }, [params.id, router]);

  const handleSubmit = async (data: CreateMemberInput & { photoUrl?: string }) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/members/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Member updated successfully");
        router.push(`/members/${params.id}`);
      } else {
        if (res.status === 409 && json.errors) {
          return { fieldErrors: json.errors as Record<string, string[]> };
        }
        toast.error(json.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="max-w-4xl mx-auto animate-pulse"><div className="card h-96 bg-slate-50" /></div>;
  }

  if (!member) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/members/${params.id}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Member</h1>
          <p className="text-slate-500 text-sm font-mono">{member.membershipId as string}</p>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <MemberForm
          defaultValues={{
            name: member.name as string,
            nameTamil: member.nameTamil as string || "",
            position: member.position as string || "",
            address: member.address as string,
            district: member.district as string,
            taluk: member.taluk as string,
            industry: member.industry as string || "",
            village: member.village as string || "",
            phone: member.phone as string,
            email: member.email as string || "",
            dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth as string).toISOString().split("T")[0] : "",
            weddingDate: member.weddingDate ? new Date(member.weddingDate as string).toISOString().split("T")[0] : "",
            photoUrl: member.photoUrl as string || "",
            aadhaar: member.aadhaarHash as string || "",
            businessName: member.businessName as string || "",
            businessNameTamil: member.businessNameTamil as string || "",
            status: member.status as any,
          }}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Update Member"
        />
      </div>
    </div>
  );
}
