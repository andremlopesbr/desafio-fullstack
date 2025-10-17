<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class PaymentCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return [
            'data' => PaymentResource::collection($this->collection),
            'meta' => [
                'count' => $this->collection->count(),
            ],
        ];
    }
}
