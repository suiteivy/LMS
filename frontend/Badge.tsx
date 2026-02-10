import React from "react";

type BadgeProps = {
  status: string;
};

export function Badge({ status }: BadgeProps) {
  const getColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-500 text-white";
      case "pending":
        return "bg-yellow-500 text-black";
      case "failed":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-300 text-black";
    }
  };

  return (
    <span className={`px-2 py-1 rounded ${getColor(status)}`}>
      {status}
    </span>
  );
}
