"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MemberForm } from "@/components/members/member-form";
import type { CreateMemberInput } from "@/lib/validation/member.schema";
import toast from "react-hot-toast";

export default function NewMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateMemberInput & { photoUrl?: string }) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(`Member ${json.data.membershipId} created successfully!`);
        router.push(`/members/${json.data.id}`);
      } else {
        if (res.status === 409 && json.errors) {
          return { fieldErrors: json.errors as Record<string, string[]> };
        }
        if (json.errors) {
          const firstError = Object.values(json.errors as Record<string, string[]>)[0]?.[0];
          toast.error(firstError || json.message);
        } else {
          toast.error(json.message || "Failed to create member");
        }
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/members" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add New Member</h1>
          <p className="text-slate-500 text-sm">Fill in the member details below</p>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <MemberForm onSubmit={handleSubmit} loading={loading} submitLabel="Create Member" />
      </div>
    </div>
  );
}
