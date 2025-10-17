<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'description' => $this->description,
            'numberOfClients' => $this->numberOfClients,
            'gigabytesStorage' => $this->gigabytesStorage,
            'price' => $this->price,
            'active' => $this->active,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            'contracts' => $this->whenLoaded('contracts'),
        ];
    }
}
